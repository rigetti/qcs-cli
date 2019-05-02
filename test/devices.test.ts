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
});
