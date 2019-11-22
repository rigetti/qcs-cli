import {expect, test} from '@oclif/test';

import { endTimeDate, mockGetReservations, startTimeDate } from './test-utils';

const output = `CURRENTLY RUNNING COMPUTE BLOCKS
ID    START                    END                      DURATION  LATTICE            PRICE
0     ${startTimeDate}${endTimeDate}1.00h     test-lattice       $1.00

`;

describe('test the qcs reservations command', () => {
  beforeEach(() => {
    mockGetReservations();
  });

  test
    .stdout()
    .command(['reservations'])
    .it('should call the reservations command with no arguments and verify output', ctx => {
      expect(ctx.stdout).to.equal(output);
    });

  test
    .stdout()
    .command(['reservations', '--format=json-pretty'])
    .it('should call the reservations command with no arguments and verify output', ctx => {
      const reservations = JSON.parse(ctx.stdout);
      expect(reservations[0].id).to.equal(0);
      expect(reservations[0].user_email).to.equal('isidor.rabi@bloch.org');
    });
});
