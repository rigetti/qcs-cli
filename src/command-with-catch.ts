import Command from '@oclif/command';
import * as clc from 'cli-color';
import { cli } from 'cli-ux';
import { handleServerErrorIfPossible } from './http';
import logger, { colors } from './logger';

export default abstract class CommandWithCatch extends Command {

  public logErrorAndExit(message: string) {
    this.log(colors.error(message));
    this.exit(1);
  }

  protected async catch(err: any): Promise<any> {
    if (err.oclif) {
      await this.originalCatch(err);
    }
    try {
      handleServerErrorIfPossible(err);
    } catch (_err) {
      logger.error('We\'ve encountered an unexpected error. Please contact support if this issue recurs.');
      logger.error(err.stack);
    }
    this.exit(1);
  }

  private async originalCatch(err: any): Promise<any> {
    if (!err.message) throw err;
    if (err.message.match(/Unexpected arguments?: (-h|--help|help)(,|\n)/)) {
      return this._help();
    }
    if (err.message.match(/Unexpected arguments?: (-v|--version|version)(,|\n)/)) {
      return this._version();
    }
    try {
      cli.action.stop(clc.bold.red('!'));
    }
    catch (_a) { }
    throw err;
  }

}
