import Command from '@oclif/command';
import { handleServerErrorIfPossible } from './http';
import logger, { colors } from './logger';

/**
 * CommandWithCatch overrides Command#catch. If oclif throws
 * a validation error, CommandWithCatch will pass it to the
 * original oclif catch method. If the error is an axios
 * response error, CommandWithCatch will log that server
 * error for the user to read. Otherwise, it will log an
 * unexpected error.
 */
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
