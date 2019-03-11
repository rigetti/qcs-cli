import { Command, flags } from '@oclif/command';

import { DevicesByName, GET } from '../http';
import { serializeDevices } from '../utils';

const STATIC_EXAMPLE = `$ qcs devices`;

export default class Devices extends Command {
  static description = 'View available QPU devices.';

  static examples = [STATIC_EXAMPLE];

  static flags = {
    help: flags.help({ char: 'h' }),
  };

  async run() {
    try {
      const devices = await GET.devices() as DevicesByName;
      if (Object.keys(devices).length === 0) {
        this.log('\nNo devices found.\n');
      } else {
        this.log(serializeDevices(devices));
      }
    } catch (e) {
      this.log(`error: ${e}`);
    }
  }
}
