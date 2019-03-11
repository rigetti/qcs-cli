import { Command, flags } from '@oclif/command';

import { GET } from '../http';
import {
  serializeReservations,
} from '../utils';

const staticExample = 'View the compute block schedule.';

export default class Reservations extends Command {
  static description = 'View the compute block schedule.';

  static examples = [staticExample];

  static flags = {
    help: flags.help({ char: 'h' }),
  };

  async run() {
    try {
      const reservations = await GET.schedule();
      this.log(serializeReservations(reservations));
    } catch (err) {
      console.log('error:', err);
    }
  }
}
