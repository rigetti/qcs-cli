import { flags } from '@oclif/command';

import CommandWithCatch from '../command-with-catch';
import { GET } from '../http';
import {
  serializeReservations,
} from '../utils';

const staticExample = 'qcs reservations';

export default class Reservations extends CommandWithCatch {
  static description = 'View the compute block schedule.';

  static examples = [staticExample];

  static flags = {
    help: flags.help({ char: 'h' }),
  };

  async run() {
    const reservations = await GET.schedule();
    this.log(serializeReservations(reservations));
  }
}
