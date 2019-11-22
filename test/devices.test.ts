import {expect, test} from '@oclif/test';

import { mockGetDevices } from './test-utils';

const output = `DEVICE
Name: test-device

`;

describe('test the qcs devices command', () => {
  beforeEach(() => {
    mockGetDevices();
  });

  test
    .stdout()
    .command(['devices'])
    .it('should call the devices command with no arguments and verify output', ctx => {
      expect(ctx.stdout).to.equal(output);
    });

  test
    .stdout()
    .command(['devices', '--format=json'])
    .it('should call the devices command with no arguments and output in json format', ctx => {
      const output = JSON.parse(ctx.stdout);
      expect(output['test-device'].device_name).to.equal('test-device');
      expect(output['test-device'].num_qubits).to.equal(16);
    });
});
