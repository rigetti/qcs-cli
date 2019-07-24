import { Command, flags } from '@oclif/command';

import { GET } from '../http';
import {
  bookReservations,
  confirmReservationPrompt,
  logCredits,
  makeAvailabilityRequest,
  makeReservationRequest,
  minimumAvailabilityStartTime,
  red,
  reset,
  serializeAvailabilities,
} from '../utils';

const STATIC_EXAMPLE = `Reserve time.

EXAMPLES:
$ qcs reserve --lattice 6Q-Ring --start "12/8/18 2pm PST" --duration 30m
`;

export default class Reserve extends Command {
  static description = 'Book reservations in the compute schedule.';

  static examples = [STATIC_EXAMPLE];

  static flags = {
    help: flags.help({ char: 'h' }),
    // flag with a value (-n, --name=VALUE)
    lattice: flags.string({
      char: 'l',
      description: 'Lattice on which to book time.',
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
      default: '30m',
    }),
    notes: flags.string({
      char: 'n',
      description: 'Free-form text notes for this reservation',
      required: false,
      default: '',
    }),
  };

  async run() {
    const { flags } = this.parse(Reserve);

    if (!flags.duration.match(/^\d+[hm]?/)) {
      console.log(
        `Invalid duration -- ${flags.duration} -- please use e.g. 30m or 1h`,
      );
      return;
    }

    const availreq = makeAvailabilityRequest(flags.start, flags.duration, flags.lattice);

    try {
      let answer;

      do {
        const credits = await GET.credits();
        logCredits(credits);

        const availabilities = await GET.availability(availreq);
        this.log(serializeAvailabilities(availabilities));

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
        let availability;

        availreq.start_time = availabilities[answer as number].start_time;
        availability = availabilities[answer as number];

        if (credits.available_credit - availability.expected_price < 0) {
          const line = `${red}\nAlert! This reservation's price is more than your current available balance. Booking it would result in a usage bill. If you believe this is in error, please contact support@rigetti.com.${reset}`;
          console.log(line);
          return;
        }
        const resreq = makeReservationRequest(availreq, availability.lattice_name, flags.notes || '');
        this.log(await bookReservations(resreq));
      } while (answer === 'n');
    } catch (e) {
      console.error('error:', e);
    }
  }
}
