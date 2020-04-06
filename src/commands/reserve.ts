import { flags } from '@oclif/command';

import CommandWithCatch from '../command-with-catch';
import { GET, POST } from '../http';
import {
  bookReservations,
  confirmReservationPrompt,
  logCredits,
  makeAvailabilityRequest,
  makeReservationRequest,
  minimumAvailabilityStartTime,
  serializeAvailabilities,
  pick,
  serializeReservations,
} from '../utils';
import { baseOptions, SerializeFormat } from '../baseOptions';

const STATIC_EXAMPLE = `Reserve time.

EXAMPLES:
$ qcs reserve --device Asepn-7  --start "12/8/2020 2pm PST" --duration 30m
`;

export default class Reserve extends CommandWithCatch {
  static description = 'Book reservations in the compute schedule.';

  static examples = [STATIC_EXAMPLE];

  static flags = {
    help: flags.help({ char: 'h' }),
    // flag with a value (-n, --name=VALUE)
    device: flags.string({
      char: 'd',
      description: 'Device on which to book time.',
      required: false,
    }),
    start: flags.string({
      char: 's',
      description: `A date/time on or after which to book compute time.
 If it contains spaces, place in quotes. (e.g., now, "friday at 5pm", "Dec 8 @ 2:15pm", "12/08/18 2:30 PST").`,
      required: true,
      default: 'now',
    }),
    duration: flags.string({
      char: 't',
      description:
        'Duration of booked compute time. (h, hr, hours, m, min, minutes, s, sec, seconds, etc)',
      required: true,
      default: '15m',
    }),
    notes: flags.string({
      char: 'n',
      description: 'Free-form text notes for this reservation',
      required: false,
      default: '',
    }),
    list: flags.boolean({
      description: 'Just log availabilities without choosing a time.',
      required: false,
      default: false,
    }),
    ...pick(baseOptions, 'format', 'confirm'),
  };

  async run() {
    const { flags } = this.parse(Reserve);

    if (!flags.duration.match(/^\d+[hm]?/)) {
      console.log(
        `Invalid duration -- ${flags.duration} -- please use e.g. 30m or 1h`,
      );
      return;
    }

    if (flags.list) {
      const availreq = makeAvailabilityRequest(flags.start, flags.duration, flags.device);
      const availabilities = await GET.availability(availreq);
      this.log(serializeAvailabilities(availabilities, flags.format as SerializeFormat));
      return;
    }
    if (flags.confirm) {
      if (!flags.device) {
        this.logErrorAndExit('Must provide device name when confirming reservation.');
        return;
      }
      const availreq = makeAvailabilityRequest(flags.start, flags.duration, flags.device);
      const resreq = makeReservationRequest(availreq, flags.device, flags.notes || '');
      const reservations = await POST.reserve(resreq);
      this.log(serializeReservations(reservations, { format: flags.format as SerializeFormat }));
      return;
    }

    let answer;

    do {
      const credits = await GET.credits();
      logCredits(credits);

      const availreq = makeAvailabilityRequest(flags.start, flags.duration, flags.device);
      const availabilities = await GET.availability(availreq);
      this.log(serializeAvailabilities(availabilities, flags.format as SerializeFormat));

      if (!availabilities || availabilities.length < 1) return;

      answer = await confirmReservationPrompt(availabilities.length);

      if (answer === 'n') {
        // Check for another start time based on the earliest time
        // returned plus the requested duration. This only advances
        // the time on the earliest available device. For example,
        // if device A is available at 10:00 and device B is
        // available at 12:00, this 'n' loop will only show a new
        // time for device A after 10:00, not for device B after
        // 12:00. There isn't a straightforward way to advance them
        // both.
        const earliestStartTime = minimumAvailabilityStartTime(availabilities);
        availreq.start_time = new Date(
          new Date(earliestStartTime).getTime() + availreq.duration * 1e3,
        ).toISOString();
        continue;
      } else if (answer === 'q') {
        this.log('exiting.\n');
        return;
      }

      // Assume answer is a number specifying the index of the availability to book.
      const availability = availabilities[answer as number];
      availreq.start_time = availability.start_time;

      if (credits.available_credit - availability.expected_price < 0) {
        const error = `Alert! This reservation's price is more than your current available balance.
Booking it result in a usage bill. If you believe this is an error, please contact support@rigetti.com.`;
        this.logErrorAndExit(error);
        return;
      }
      const resreq = makeReservationRequest(availreq, availability.lattice_name, flags.notes || '');
      this.log(await bookReservations(resreq));
    } while (answer === 'n');
  }
}
