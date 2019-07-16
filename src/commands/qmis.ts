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

const enum ACTIONS {
  START = 'start',
  STOP = 'stop',
  VIEW = 'view',
  CREATE = 'create',
  DELETE = 'delete',
}

export default class QMIS extends Command {
  static description = 'View, create, start/stop, and delete QMIs.';

  static examples = [STATIC_EXAMPLE];

  static args = [
    {
      name: 'action',
      description: 'What QMI action would you like to take?',
      required: true,
      hidden: false,
      default: '',
      options: [
        'start',
        'stop',
        'delete',
        'create',
        'view',
      ],
    },
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
    id: flags.string({
      char: 'i',
      description: 'ID of a QMI, optionally supplied during view, start/stop, or delete.',
      required: false,
    }),
    keypath: flags.string({
      char: 'k',
      description: 'Path to an SSH public key, supplied during qmis create.',
      required: false,
    }),
    timezone: flags.string({
      char: 'z',
      description: 'Value to which the QMI timezone should be set, e.g. America/Los_Angeles. Defaults to the system timezone of the machine on which the CLI is being run.',
      required: false,
    }),
  };

  async run() {
    const { flags, args } = this.parse(QMIS);

    if (args.action === ACTIONS.CREATE) {
      // Create a QMI.
      if (!flags.keypath) throw new Error(`Must supply a --keypath when creating a QMI.`);
      if (flags.id) throw new Error(`Cannot supply an --id when creating a QMI.`);

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
    } else if (args.action === ACTIONS.DELETE) {
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
    } else if (args.action === ACTIONS.START || args.action === ACTIONS.STOP) {
      if (flags.keypath) throw new Error(`Cannot supply a --keypath when powering on a QMI.`);
      if (!flags.id) throw new Error(`Must supply an --id when deleting a QMI.`);

      const id = parsePositiveInteger(flags.id);
      if (!id) { throw new Error(`Must supply a positive integer ID when deleting a QMI.`); }

      try {
        const qmiURLAction = args.action === ACTIONS.START ? 'start' : 'stop';
        await POST.qmi(id, qmiURLAction);
        this.log(`QMI successfully ${args.action === ACTIONS.START ? 'powered on' : 'powered off'}`);
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
