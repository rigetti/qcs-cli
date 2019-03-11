import * as fs from 'fs';
import * as ini from 'ini';
import * as os from 'os';

const config = ini.parse(
  fs.readFileSync(`${os.homedir()}/.qcs_config`, 'utf-8'),
);

export const userToken = config['Rigetti Forest'].user_id;
export const publicForestServer = config['Rigetti Forest'].url;