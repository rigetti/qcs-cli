import {expect, test} from '@oclif/test';

import { mockGetLattices } from './test-utils';

const serializedLattices = `LATTICE
Name: test_lattice
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
      expect(ctx.stdout).to.equal(serializedLattices);
    });
});
