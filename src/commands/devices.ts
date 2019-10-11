import { flags } from '@oclif/command';

import CommandWithCatch from '../command-with-catch';
import { DevicesByName, GET } from '../http';
import { serializeDevices } from '../utils';

const STATIC_EXAMPLE = `$ qcs devices`;

export default class Devices extends CommandWithCatch {
  static description = 'View available QPU devices.';

  static examples = [STATIC_EXAMPLE];

  static flags = {
    help: flags.help({ char: 'h' }),
  };

  async run() {
    const devices = await GET.devices() as DevicesByName;
    this.log(serializeDevices(devices));
  }
}
