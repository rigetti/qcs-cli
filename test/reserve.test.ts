import {expect, test} from '@oclif/test';
import * as sinon from 'sinon';

import * as utils from '../src/utils';
import {
         endTimeDate,
         endTimeDate2,
         latticeName,
         mockGetAvailability,
         mockGetAvailabilityReturnTwo,
         mockGetCredits,
         mockPostReservations,
         reservationNotes,
         reservationRequest,
         startTimeDate,
         startTimeDate2,
} from './test-utils';

const singleOutput = `Available credits: $8.00

The next available compute block is:

START                    END                      DURATION  LATTICE            PRICE
${startTimeDate}${endTimeDate}1.00h     test-lattice       $1.00

Booking reservation(s)...
Reservation(s) confirmed, run 'qcs reservations' to see the latest schedule.
`;

const pluralOutput = `Available credits: $8.00

The next available compute blocks are:

ID    START                    END                      DURATION  LATTICE            PRICE
0     ${startTimeDate}${endTimeDate}1.00h     test-lattice       $1.00
1     ${startTimeDate2}${endTimeDate2}1.00h     test-lattice       $1.00

Booking reservation(s)...
Reservation(s) confirmed, run 'qcs reservations' to see the latest schedule.
`;

describe('test the qcs reserve command', () => {
  describe('select first option', () => {
    let confirmReserveStub: sinon.SinonStub;
    beforeEach(() => {
      confirmReserveStub = sinon.stub(utils, 'confirmReservationPrompt');
      mockGetCredits();
      mockGetAvailability();
      mockGetAvailabilityReturnTwo();
      mockPostReservations(reservationRequest);
      confirmReserveStub.returns(new Promise((ok) => ok(0)));
    });
    afterEach(() => {
      confirmReserveStub.restore();
    });

    test
      .stdout()
      .command(['reserve', '-l', latticeName, '-t', '60m', '-n', reservationNotes])
      .it('should call the reserve command and verify output for a single availability', ctx => {
        expect(ctx.stdout).to.equal(singleOutput);
      });

    test
      .stdout()
      .command(['reserve', '-l', latticeName, '-t', '60m', '-n', reservationNotes])
      .it('should call the reserve command and verify output for a multiple returned availabilities', ctx => {
        expect(ctx.stdout).to.equal(pluralOutput);
      });
  });
});
