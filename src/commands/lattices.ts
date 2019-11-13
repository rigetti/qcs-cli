import { flags } from '@oclif/command';

import { baseOptions, SerializeFormat } from '../baseOptions';
import CommandWithCatch from '../command-with-catch';
import { GET, LatticesByName } from '../http';
import { parsePositiveInteger, pick, serializeLattices } from '../utils';

const STATIC_EXAMPLE = `$ qcs lattices`;

export default class Lattices extends CommandWithCatch {
  static description = 'View available lattices.';

  static examples = [STATIC_EXAMPLE];

  static flags = {
    help: flags.help({ char: 'h' }),
    device: flags.string({
      char: 'd',
      description: 'Device from which lattices should be queried.',
      required: false,
    }),
    num_qubits: flags.string({
      char: 'n',
      description: 'Show only lattices with n qubits.',
      required: false,
    }),
    ...pick(baseOptions, 'format'),
  };

  async run() {
    const { flags } = this.parse(Lattices);
    const device = flags.device;
    const numQubits = flags.num_qubits ? parsePositiveInteger(flags.num_qubits) : undefined ;

    if (flags.num_qubits && !numQubits) {
      this.logErrorAndExit('Please supply a positive integer for number of qubits.');
    }

    const lattices = await GET.lattices(device, numQubits) as LatticesByName;
    this.log(serializeLattices(lattices, flags.format as SerializeFormat));
  }
}
