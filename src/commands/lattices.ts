import { Command, flags } from '@oclif/command';

import { GET, LatticesByName } from '../http';
import { parsePositiveInteger, serializeLattices } from '../utils';

const STATIC_EXAMPLE = `$ qcs lattices`;

export default class Lattices extends Command {
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
  };

  async run() {
    const { flags } = this.parse(Lattices);
    const device = flags.device;
    const numQubits = flags.num_qubits ? parsePositiveInteger(flags.num_qubits) : undefined ;

    if (flags.num_qubits && !numQubits) {
      throw new Error('Please supply a positive integer for number of qubits.');
    }

    try {
      const lattices = await GET.lattices(device, numQubits) as LatticesByName;

      if (Object.keys(lattices).length === 0) {
        return this.log('\nNo lattices found.\n');
      }

      this.log(serializeLattices(lattices));
    } catch (e) {
      this.log(`error: ${e}`);
    }
  }
}
