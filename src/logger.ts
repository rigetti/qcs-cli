import * as clc from 'cli-color';

type Log = (message: any, ...optionalParams: any[]) => void;

export const colors = {
  error: clc.bold.redBright,
};

interface Logger {
  log: Log;
  debug: Log;
  warn: Log;
  info: Log;
  error: Log;
  success: Log;
}

const styleLog = (fn: Log, color: clc.Format) => (message: any, ...optionalParams: any[]) =>
  fn(color(message), ...optionalParams.map((param) => color(param)));

const logger: Logger = {
  // tslint:disable no-console
  debug: styleLog(console.debug, clc.blackBright),
  error: styleLog(console.error, colors.error),
  info: styleLog(console.info, clc.blueBright),
  log: styleLog(console.log, clc.blackBright),
  warn: styleLog(console.warn, clc.bold.yellow),
  success: styleLog(console.info, clc.bold.green),
};

export default logger;
