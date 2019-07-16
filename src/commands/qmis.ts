import { Command, flags } from '@oclif/command';
import * as moment from 'moment-timezone';

import { DELETE, GET, POST } from '../http';
import { confirmDeleteQMI,
         getKey,
         parsePositiveInteger,
         QMI,
         QMIRequest,
         serializeQMIs } from '../utils';

const STATIC_EXAMPLE = `$ qcs qmis`;


export default class QMIS extends Command {
  static description = 'View, create, start/stop, and delete QMIs.';

  static examples = [STATIC_EXAMPLE];

  static flags = {
    help: flags.help({ char: 'h' }),
    id: flags.string({
      char: 'i',
      description: 'ID of a QMI, optionally supplied during query, start/stop, or delete.',
      required: false,
    }),
    create: flags.boolean({
      char: 'c',
      description: 'Create a QMI, requires specifying an SSH public --keypath, and optionally a --timezone.',
    }),
    keypath: flags.string({
      char: 'k',
      description: 'Path to an SSH public key, supplied during qmis --create.',
      required: false,
    }),
    timezone: flags.string({
      char: 'z',
      description: 'Value to which the QMI timezone should be set, e.g. America/Los_Angeles. Defaults to the system timezone of the machine on which the CLI is being run.',
      required: false,
    }),
    delete: flags.boolean({
      char: 'd',
      description: 'Delete a QMI, requires specifying an --id.',
      required: false,
    }),
    start: flags.boolean({
      description: 'Power on a QMI, requires specifying an --id.',
      required: false,
    }),
    stop: flags.boolean({
      description: 'Power off a QMI, requires specifying an --id.',
      required: false,
    }),
  };

  async run() {
    const { flags } = this.parse(QMIS);

    if (flags.create) {
      // Create a QMI.
      if (!flags.keypath) throw new Error(`Must supply a --keypath when creating a QMI.`);
      if (flags.id) throw new Error(`Cannot supply an --id when creating a QMI.`);
      if (flags.delete) throw new Error(`Cannot supply --delete and --create simultaneously`);

      let timezoneString = flags.timezone;
      if (!timezoneString) {
        timezoneString = moment.tz.guess();
        this.log(`No --timezone supplied, inferring timezone '${timezoneString}' from local system.`);
      }
      if (!moment.tz.zone(timezoneString)) {
        throw new Error(`Invalid timezone '${timezoneString}' supplied. Please provide a valid timezone.`);
      }

      const keypath = flags.keypath as string;
      try {
        await POST.qmis({ public_key: getKey(keypath) } as QMIRequest);
        this.log('QMI creation in progress. Type qcs qmis to view your QMIs.');
      } catch (e) { this.log(`error: ${e}`); }
    } else if (flags.delete) {
      // Delete a QMI.
      if (flags.keypath) throw new Error(`Cannot supply a --keypath when deleting a QMI.`);
      if (!flags.id) throw new Error(`Must supply an --id when deleting a QMI.`);

      const id = parsePositiveInteger(flags.id);
      if (!id) { throw new Error(`Must supply a positive integer ID when deleting a QMI.`); }

      let qmi;
      try {
        qmi = await GET.qmi(id) as QMI;
      } catch(e) { this.log(`error: ${e}`); process.exit(1); }

      if (!qmi) throw new Error(`No QMI found with id ${id}`);

      const answer = await confirmDeleteQMI(qmi);
      if (answer) {
        await DELETE.qmis(id);
        this.log('QMI deletion successful.');
      } else { this.log('Typed response doesn\'t match QMI IP address, aborting deletion.'); }
    } else if (flags.start || flags.stop) {
      if (flags.keypath) throw new Error(`Cannot supply a --keypath when powering on/off a QMI.`);
      if (!flags.id) throw new Error(`Must supply an --id when deleting a QMI.`);
      if (flags.start && flags.stop) throw new Error(`Cannot start (--start) and stop (--stop) QMI at once.`);

      const id = parsePositiveInteger(flags.id);
      if (!id) { throw new Error(`Must supply a positive integer ID when powering on/off a QMI.`); }

      try {
        const qmiURLAction = flags.start ? 'start' : 'stop';
        await POST.qmi(id, qmiURLAction);
        this.log(`QMI successfully ${flags.start ? 'powered on' : 'powered off'}.`);
      } catch(e) { this.log(`error: ${e}`); process.exit(1); }
    } else {
      // Query for QMIs.
      const id = flags.id ? parsePositiveInteger(flags.id) : undefined;
      let qmis;
      try {
        if (id) {
          qmis = [await GET.qmi(id) as QMI];
        } else {
          qmis = await GET.qmis() as QMI[];
        }
      } catch(e) {
        this.log(`error: ${e}`); process.exit(1);
      }

      this.log(serializeQMIs(qmis));
    }
  }
}
