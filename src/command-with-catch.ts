import Command from '@oclif/command';
import { handleServerErrorIfPossible } from './http';
import logger, { colors } from './logger';

export default abstract class CommandWithCatch extends Command {

  public logErrorAndExit(message: string) {
    this.log(colors.error(message));
    this.exit(1);
  }

  protected async catch(err: any): Promise<any> {
    if (err.oclif) {
      return super.catch(err);
    }
    try {
      handleServerErrorIfPossible(err);
    } catch (_err) {
      logger.error('We\'ve encountered an unexpected error. Please contact support if this issue recurs.');
      logger.error(err.stack);
    }
    this.exit(1);
  }
}
