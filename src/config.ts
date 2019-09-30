import * as fs from 'fs';
import * as ini from 'ini';
import * as os from 'os';

const config = ini.parse(
  fs.readFileSync(`${os.homedir()}/.qcs_config`, 'utf-8'),
);

interface AccessToken {
  access_token?: string;
  refresh_token?: string;
}

export type ForestEnvironment = 'production' | 'qa' | 'staging' | 'dev' | undefined;

interface ForestConfig {
  qmiAccessToken: AccessToken;
  userAccessToken: AccessToken;
  userToken: string;
  url: string;
  forestAdminKey?: string;
}

const getAccessToken = (accessTokenType: 'qmi' | 'user', env: ForestEnvironment): AccessToken => {
  let data: string;
  const envTokenPath = `${os.homedir()}/.qcs/${accessTokenType}_access_token__${env}`;
  const defaultPath = `${os.homedir()}/.qcs/qmi_access_token`;
  if (env && fs.existsSync(envTokenPath)) {
    data = fs.readFileSync(envTokenPath, 'utf-8');
  } else if (fs.existsSync(defaultPath)) {
    data = fs.readFileSync(defaultPath, 'utf-8');
  } else {
    return {};
  }
  return JSON.parse(data);
};

export const getConfig = (env?: ForestEnvironment): ForestConfig => {
  const rawConfig = (env && config['Rigetti Forest'][env]) || config['Rigetti Forest'];
  return {
    url: rawConfig.url,
    userToken: rawConfig.user_token,
    forestAdminKey: rawConfig.forest_admin_key,
    qmiAccessToken: getAccessToken('qmi', env),
    userAccessToken: getAccessToken('user', env),
  };
};

