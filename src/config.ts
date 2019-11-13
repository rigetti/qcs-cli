import * as ajv from 'ajv';
import * as fs from 'fs';
import * as ini from 'ini';
import * as os from 'os';
import * as querystring from 'querystring';
import * as request from 'request-promise-native';
import logger from './logger';

export interface AccessToken {
  access_token: string;
  refresh_token: string;
}

export const forestEnvironment =  process.env.FOREST_ENVIRONMENT || process.env.FE;

const maybeReadFileSync = (path: string, encoding = 'utf-8') => {
  try {
    return fs.readFileSync(path, encoding);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return;
    }
    throw err;
  }
};

const getAccessToken = (accessTokenType: 'qmi' | 'user'): AccessToken | undefined => {
  let data: string | undefined;
  if (forestEnvironment) {
    const envTokenPath = `${os.homedir()}/.qcs/${accessTokenType}_auth_token__${forestEnvironment}`;
    data = maybeReadFileSync(envTokenPath);
  }
  if (data === undefined) {
    const defaultPath = `${os.homedir()}/.qcs/${accessTokenType}_auth_token`;
    data = maybeReadFileSync(defaultPath);
  }
  if (data === undefined) {
    return;
  }
  return JSON.parse(data);
};

const getConfigPath = () => process.env.QCS_CONFIG || process.env.QC || `${os.homedir()}/.qcs_config`;

const getAuthPath = (authType: 'user' | 'qmi') => {
  if (process.env.AUTH) {
    return process.env.AUTH;
  }
  if (forestEnvironment) {
    const authPath = `${os.homedir()}/.qcs/${authType}_auth_token__${forestEnvironment.toLowerCase()}`;
    if (fs.existsSync(authPath)) {
      return authPath;
    }
  }
  return `${os.homedir()}/.qcs/${authType}_auth_token`;
};

const QCS_CONFIG_SCHEMA = {
  type: 'object',
  required: ['url'],
  properties: {
    url: { type: 'string', format: 'uri' },
    qcs_url: { type: 'string', format: 'uri' },
    user_id: { type: 'string' },
  },
};

const getRawConfig = (): RawQCSConfig => {
  let rawConfig: any = {};
  try {
    rawConfig = ini.parse(
      fs.readFileSync(getConfigPath(), 'utf-8'),
    );
  } catch (err) {
    if (err.code !== 'ENOENT') {
      logger.error(`We could not parse ${getConfigPath()}.`);
      logger.debug(err);
      process.exit(1);
    }
  }
  rawConfig = (rawConfig && rawConfig['Rigetti Forest']) || {};
  if (forestEnvironment && rawConfig[forestEnvironment]) {
    rawConfig = rawConfig[forestEnvironment] || {};
  }
  return rawConfig;
};

export const assertValidConfig = (rawConfig: any, schema: any) => {
  const validator = new ajv();
  if (!validator.validate(schema, rawConfig)) {
    logger.error(`Your config file at ${getConfigPath()} is not valid.`);
    logger.debug('You can specify the path with the `QCS_CONFIG` or `QC` environment variable.');
    logger.debug(JSON.stringify(validator.errors, undefined, 2));
    process.exit(1);
  }
};

const logCredentialUpdateInstructions = (qcsURL: string) => {
  logger.debug(`Please visit ${qcsURL}/auth/token to update your client credentials.`);
  let authPath = '~/.qcs/user_auth_token';
  if (forestEnvironment) {
    authPath = `~/.qcs/user_auth_token__${forestEnvironment}`;
  }
  logger.debug(`Save your credentials to \`${authPath}\`.`);
  logger.debug(
    'You may also use the `AUTH` environment variable to customize the path to your credentials.');
};

export interface RawQCSConfig {
  user_id?: string;
  qcs_url?: string;
  url: string;
  [key: string]: string | undefined;
}

export class QCSConfig {
  protected readonly rawConfig: RawQCSConfig;
  protected readonly rawConfigSchema: any = QCS_CONFIG_SCHEMA;
  protected qmiAccessToken?: AccessToken;
  protected userAccessToken?: AccessToken;
  private nAuthRefreshes = 0;

  constructor() {
    this.userAccessToken = getAccessToken('user');
    this.qmiAccessToken = getAccessToken('qmi');
    this.rawConfig = getRawConfig();
    if (forestEnvironment === 'test' && !this.rawConfig.url) {
      // tslint:disable-next-line
      this.rawConfig.url = 'http://localhost:8000';
      this.rawConfig.forest_admin_key = 'pkey';
    }
    this.assertValidConfig();
    this.assertCredentials();
  }

  get url() {
    return this.rawConfig.url;
  }

  get qcsURL() {
    if (this.rawConfig.qcs_url) {
      return this.rawConfig.qcs_url;
    }
    if (/:8000/.test(this.rawConfig.url)) {
      return this.rawConfig.url.replace(/:8000/, ':3000');
    }
    return this.rawConfig.url.replace(/forest-server\./, '');
  }

  get headers() {
    const headers: { [key: string]: string } = {};
    if (this.userAccessToken) {
      headers.Authorization = `Bearer ${this.userAccessToken.access_token}`;
    } else if (this.qmiAccessToken) {
      headers['X-QMI-AUTH-TOKEN'] = this.qmiAccessToken.access_token;
    }
    if (this.rawConfig.user_id) {
      // WARN: This will be deprecated.
      headers['X-User-Id'] = this.rawConfig.user_id;
    }
    return headers;
  }

  // request will retry any 401 or 403 response after refreshing
  // the available user or QMI access token.
  public async request<T>(opts: request.Options): Promise<T>{
    try {
      return this._requestWithDefaults(opts);
    } catch (err) {
      if (err.response && [401, 403].indexOf(err.response.statusCode) >= 0) {
        await this.refreshAuthToken();
        return this._requestWithDefaults(opts);
      }
      throw err;
    }
  }

  public async refreshAuthToken() {
    this.nAuthRefreshes += 1;
    try {
      if (this.userAccessToken) {
        await this.refreshUserAccessToken();
      } else if (this.qmiAccessToken) {
        await this.refreshQMIAccessToken();
      }
    } catch (err) {
      // Try to refresh again after waiting 800ms after the first attempt.
      if (this.nAuthRefreshes === 1) {
        await new Promise((resolve: () => void) => setTimeout(resolve, 800));
        await this.refreshAuthToken();
        return;
      }
      throw err;
    }
  }

  protected assertValidConfig() {
    assertValidConfig(this.rawConfig, QCS_CONFIG_SCHEMA);
  }

  private assertCredentials() {
    if (forestEnvironment === 'test') {
      return;
    }
    if (!this.qmiAccessToken && !this.userAccessToken) {
      if (this.rawConfig.user_id) {
        logger.warn('The `user_id` attribute in ~/.qcs_config is deprecated.');
        logCredentialUpdateInstructions(this.qcsURL);
      } else {
        logger.error('You do not have credentials configured.');
        logCredentialUpdateInstructions(this.qcsURL);
        process.exit(1);
      }
    }
  }

  private get _requestWithDefaults() {
    return request.defaults({
      headers: this.headers,
      simple: true,
      json: true,
      baseUrl: this.rawConfig.url,
    });
  }

  private updateAccessToken(accessToken: AccessToken, accessTokenType: 'qmi' | 'user') {
    fs.writeFileSync(
      getAuthPath(accessTokenType),
      JSON.stringify(accessToken),
      { encoding: 'utf-8' });
    if (accessTokenType === 'user') {
      this.userAccessToken = accessToken;
    } else if (accessTokenType === 'qmi') {
      this.qmiAccessToken = accessToken;
    }
  }

  private async refreshUserAccessToken() {
    if (!this.userAccessToken) {
      throw new Error('Refresh token required to refresh user access token.');
    }
    const accessToken = await this._requestWithDefaults({
      url: '/auth/idp/oauth2/v1/token',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: this.userAccessToken.refresh_token,
        scopes: ['openid', 'email', 'profile', 'offline_access'],
        redirect_uri: this.qcsURL,
      }),
    });
    this.updateAccessToken(accessToken, 'user');
  }

  private async refreshQMIAccessToken() {
    if (!this.qmiAccessToken) {
      throw new Error('Refresh token required to refresh user access token.');
    }
    const accessToken = await this._requestWithDefaults({
      url: '/auth/qmi/refresh',
      method: 'POST',
      json: this.qmiAccessToken,
    });
    this.updateAccessToken(accessToken, 'qmi');
  }
}
