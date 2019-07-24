import { expect, test } from '@oclif/test';
import * as sinon from 'sinon';

import * as utils from '../src/utils';
import {
         availability2,
         endTimeDate,
         endTimeDate2,
         latticeName,
         mockGetAvailabilityReturnTwo,
         mockGetCredits,
         mockPostReservations,
         reservationNotes,
         reservationRequest,
         reservationsResponse2,
         startTimeDate,
         startTimeDate2,
} from './test-utils';

const pluralOutput = `Available credits: $8.00

The next available compute blocks are:

ID    START                    END                      DURATION  LATTICE            PRICE
0     ${startTimeDate}${endTimeDate}1.00h     test-lattice       $1.00
1     ${startTimeDate2}${endTimeDate2}1.00h     test-lattice       $1.00

Booking reservation(s)...
Reservation(s) confirmed, run 'qcs reservations' to see the latest schedule.
`;

describe('test the qcs reserve command with separate start times', () => {
  describe('select second option', () => {
    let confirmReserveStub: sinon.SinonStub;
    beforeEach(() => {
      confirmReserveStub = sinon.stub(utils, 'confirmReservationPrompt');
      mockGetCredits();
      mockGetAvailabilityReturnTwo();
      const request2 = {
        ...reservationRequest,
        start_time: availability2.start_time,
        end_time: availability2.end_time,
      };
      mockPostReservations(request2, reservationsResponse2);
      confirmReserveStub.returns(new Promise((ok) => ok(1)));
    });
    afterEach(() => {
      confirmReserveStub.restore();
    });

    test
      .stdout()
      .command(['reserve', '-l', latticeName, '-t', '60m', '-n', reservationNotes])
      .it('should request accurate start time from availability2', (ctx) => {
        expect(ctx.stdout).to.equal(pluralOutput);
      });
  });
});
