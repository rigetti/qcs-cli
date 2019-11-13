import {expect, test} from '@oclif/test';

import { mockGetLattices } from './test-utils';

const output = `LATTICE
Name: test-lattice
  Device: some-device-name
  Number of qubits: 1
  Qubits: 2
  Price (per min.): $1.00

`;

describe('test the qcs lattices command', () => {
  beforeEach(() => {
    mockGetLattices();
  });

  test
    .stdout()
    .command(['lattices'])
    .it('should call the lattices command with no arguments and verify output', ctx => {
      expect(ctx.stdout).to.equal(output);
    });

  test
    .stdout()
    .command(['lattices', '--format=json'])
    .it('should call the lattices command with no arguments and output in json', ctx => {
      const lattices = JSON.parse(ctx.stdout);
      expect(lattices['test-lattice'].device).to.equal('some-device');
      expect(lattices['test-lattice'].lattice_name).to.equal('test-lattice');
    });
});
