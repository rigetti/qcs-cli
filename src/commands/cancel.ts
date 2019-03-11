import { Command, flags } from '@oclif/command';

import {
  confirmCancelReservationPrompt,
  parseValueOrValues,
  serializeReservations,
} from '../utils';

import { DELETE, GET } from '../http';

const STATIC_EXAMPLE = `Cancel a reservation, or a list of reservations.

EXAMPLES:
$ qcs cancel --id 1

# Cancel multiple reservations
# Note: still singular --id flag, use single quotes
$ qcs cancel --id '[1, 2]'
`;

export default class Cancel extends Command {
  static description = 'Cancel reservations in the compute schedule.';

  static examples = [STATIC_EXAMPLE];

  static flags = {
    help: flags.help({ char: 'h' }),
    id: flags.string({
      char: 'i',
      description: 'ID of reservation to cancel, or a list of IDs.',
      required: true,
    }),
  };

  async run() {
    const { flags } = this.parse(Cancel);
    const ids = parseValueOrValues(flags.id);

    try {
      const resToCancel = (await GET.schedule({ ids })).filter(
        r => r.status === 'ACTIVE',
      );
      if (resToCancel.length === 0) {
        throw new Error('reservation(s) found, but none that are active');
      }

      this.log(serializeReservations(resToCancel));

      const answer = await confirmCancelReservationPrompt();
      if (!answer) {
        throw new Error('aborting cancellation');
      }

      await DELETE.schedule(ids);
      this.log(
        "Reservation(s) cancelled. Type 'qcs reservations' to see the latest schedule.",
      );
    } catch (e) {
      this.log(e);
    }
  }
}
