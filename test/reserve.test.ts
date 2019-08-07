import {expect, test} from '@oclif/test';
import * as sinon from 'sinon';

import * as utils from '../src/utils';
import { endTimeDate,
         latticeName,
         mockGetAvailability,
         mockGetAvailabilityReturnTwo,
         mockGetCredits,
         mockPostReservations,
         reservationNotes,
         reservationRequest,
         startTimeDate,
} from './test-utils';
import moment = require('moment');

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
1     ${startTimeDate}${endTimeDate}1.00h     test-lattice       $1.00

Booking reservation(s)...
Reservation(s) confirmed, run 'qcs reservations' to see the latest schedule.
`;

describe('test the qcs reserve command', () => {
  beforeEach(() => {
    mockGetCredits();
    mockGetAvailability();
    mockGetAvailabilityReturnTwo();
    mockPostReservations(reservationRequest);
  });

  const confirmReserveStub = sinon.stub(utils, 'confirmReservationPrompt');
  confirmReserveStub.returns(new Promise((ok) => ok(0)));

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

  test
    .stdout()
    .command(['reserve', '-l', latticeName, '-t', '60m', '-n', reservationNotes, '-s', moment().subtract(moment.duration(5, 'minutes')).toISOString()])
    .catch((err) => {
      expect(err.message).to.include('Must use a date in the future to make availability request');
    })
    .it('should catch date validation error', () => {
      expect(true).to.be.true;
    });

  test
    .stdout()
    .command(['reserve', '-l', latticeName, '-t', '60m', '-n', reservationNotes, '-s', moment().subtract(moment.duration(5, 'minutes')).toISOString(), '-p'])
    .it('should catch date validation error', () => {
      // just checking no error is thrown here.
      expect(true).to.be.true;
    });
});
