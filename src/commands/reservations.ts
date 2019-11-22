import { flags } from '@oclif/command';

import { baseOptions, SerializeFormat } from '../baseOptions';
import CommandWithCatch from '../command-with-catch';
import { GET } from '../http';
import {
  pick, serializeReservations,
} from '../utils';

const staticExample = 'qcs reservations';

export default class Reservations extends CommandWithCatch {
  static description = 'View the compute block schedule.';

  static examples = [staticExample];

  static flags = {
    help: flags.help({ char: 'h' }),
    ...pick(baseOptions, 'format'),
  };

  async run() {
    const { flags } = this.parse(Reservations);
    const reservations = await GET.schedule();
    this.log(serializeReservations(reservations, { format: flags.format as SerializeFormat }));
  }
}
