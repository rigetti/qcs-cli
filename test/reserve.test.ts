import {expect, test} from '@oclif/test';
import * as sinon from 'sinon';

import * as utils from '../src/utils';
import { endTimeDate,
         latticeName,
         reservationNotes,
         startTimeDate,
         config,
         reservationsResponse,
         availabilitiesResponse,
         twoAvailabilitiesResponse,
         creditsResponse,
} from './test-utils';
import nock = require('nock');
import { URLS } from '../src/http';

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
  let confirmReserveStub: sinon.SinonStub;
  beforeEach(() => {
    nock(config.url)
      .get(URLS.credits)
      .reply(200, creditsResponse);

    nock(config.url)
      .post(URLS.schedule)
      .reply(200, reservationsResponse);
    confirmReserveStub = sinon.stub(utils, 'confirmReservationPrompt');
    confirmReserveStub.returns(new Promise((ok) => ok(0)));
  });
  afterEach(() => {
    sinon.restore();
    nock.cleanAll();
  });

  describe('single output', () => {
    beforeEach(() => {
      nock(config.url)
        .get(URLS.nextAvailable)
        .reply(200, availabilitiesResponse);
    });

    test
      .stdout()
      .command(['reserve', '-l', latticeName, '-t', '60m', '-n', reservationNotes])
      .it('should call the reserve command and verify output for a single availability', ctx => {
        expect(ctx.stdout).to.equal(singleOutput);
      });

    test
      .stdout()
      .command(['reserve', '--list', '-l', latticeName, '-t', '60m', '-n', reservationNotes])
      .it('should only list available times', ctx => {
        expect(ctx.stdout).to.contain('The next available compute block');
        expect(confirmReserveStub.called).to.be.false;
      });

    test
      .stdout()
      .command(['reserve', '--confirm', '-l', latticeName, '-t', '60m', '-n', reservationNotes])
      .it('should create reservation directly', ctx => {
        expect(ctx.stdout).not.to.contain('The next available compute block');
        expect(confirmReserveStub.called).to.be.false;
      });
  });

  describe('multiple output', () => {
    beforeEach(() => {
      nock(config.url)
        .get(URLS.nextAvailable)
        .reply(200, twoAvailabilitiesResponse);
    });

    test
      .stdout()
      .command(['reserve', '-l', latticeName, '-t', '60m', '-n', reservationNotes])
      .it('should call the reserve command and verify output for a multiple returned availabilities', ctx => {
        expect(ctx.stdout).to.equal(pluralOutput);
      });
  });
});
