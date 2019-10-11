import {expect, test} from '@oclif/test';
import * as sinon from 'sinon';

import * as utils from '../src/utils';
import { endTimeDate, mockDeleteReservations, mockGetReservations, startTimeDate } from './test-utils';

const output = `CURRENTLY RUNNING COMPUTE BLOCKS
ID    START                    END                      DURATION  LATTICE            PRICE
0     ${startTimeDate}${endTimeDate}1.00h     test-lattice       $1.00

Reservation(s) cancelled. Type 'qcs reservations' to see the latest schedule.
`;

describe('test the qcs cancel command', () => {
  let confirmReserveStub: sinon.SinonStub;
  beforeEach(() => {
    confirmReserveStub = sinon.stub(utils, 'confirmCancelReservationPrompt');
    confirmReserveStub.returns(new Promise((ok) => ok(true)));
    mockGetReservations();
    mockDeleteReservations();
  });
  afterEach(() => {
    sinon.restore();
  });

  test
    .stdout()
    .command(['cancel', '-i', '0'])
    .it('should call the cancel command and verify output', ctx => {
      expect(ctx.stdout).to.equal(output);
    });
});
