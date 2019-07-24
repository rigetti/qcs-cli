import { expect } from 'chai';

import {
  convertDurationStringToSeconds,
  convertSecondsToDurationString,
  minimumAvailabilityStartTime,
  parseNonNegativeInteger,
  parsePositiveInteger,
  parseValueOrValues,
} from '../src/utils';

describe('test parsePositiveInteger', () => {
  it('should take a string or undefined as input and return a number or undefined as output', () => {
    expect(parsePositiveInteger('1')).to.equal(1);
    expect(parsePositiveInteger('0')).to.equal(undefined);
    expect(parsePositiveInteger('-1.5')).to.equal(undefined);
    expect(parsePositiveInteger('a')).to.equal(undefined);
    expect(parsePositiveInteger(undefined)).to.equal(undefined);
  });
});

describe('test parseNonNegativeInteger', () => {
  it('should take a string or undefined as input and return a number or undefined as output', () => {
    expect(parseNonNegativeInteger('1')).to.equal(1);
    expect(parseNonNegativeInteger('0')).to.equal(0);
    expect(parseNonNegativeInteger('-1.5')).to.equal(undefined);
    expect(parseNonNegativeInteger('a')).to.equal(undefined);
    expect(parseNonNegativeInteger(undefined)).to.equal(undefined);
  });
});

describe('test parseValueOrValues', () => {
  it('should take a single value or array, and return a list as output', () => {
    expect(parseValueOrValues(1)).to.eql([1]);
    expect(parseValueOrValues('[1]')).to.eql([1]);
    expect(parseValueOrValues('[0, 1]')).to.eql([0, 1]);
    expect(parseValueOrValues('abc')).to.eql(['abc']);
  });
});

describe('test convertDurationStringToSeconds', () => {
  it('should take a duration string as input, and return the number of seconds as output', () => {
    expect(convertDurationStringToSeconds('1m')).to.equal(60);
    expect(convertDurationStringToSeconds('15m')).to.equal(15 * 60);
    expect(convertDurationStringToSeconds('1h')).to.equal(60 * 60);
    expect(convertDurationStringToSeconds('1.5h')).to.equal(1.5 * 60 * 60);
  });
});

describe('test convertSecondsToDurationString', () => {
  it('should take a duration string as input, and return the number of seconds as output', () => {
    expect(convertSecondsToDurationString(60)).to.equal('1.00m');
    expect(convertSecondsToDurationString(15 * 60)).to.equal('15.00m');
    expect(convertSecondsToDurationString(60 * 60)).to.equal('1.00h');
    expect(convertSecondsToDurationString(1.5 * 60 * 60)).to.equal('1.50h');
  });
});

describe('test minimumAvailabilityStartTime', () => {
  it('should return the minimum start_time of a list of Availability objects', () => {
    const expected = '2019-07-01T12:00:00+00:00'
    const starts = ['2019-12-29T12:00:00+00:00',
                    expected,
                    '2019-11-01T12:00:00+00:00',
                    '2019-12-26T12:00:00+00:00'];

    const availabilities = starts.map((start_time) => {
      return {
        lattice_name: 'MyLattice',
        start_time: start_time,
        end_time: new Date(new Date(start_time).getTime() + 3600 * 1e3).toISOString(),
        expected_price: 100
      }
    });

    const a0 = availabilities;
    const a1 = [availabilities[3],
                availabilities[2],
                availabilities[1],
                availabilities[0]];
    const a2 = [availabilities[0],
                availabilities[2],
                availabilities[1],
                availabilities[3]];
    const a3 = [availabilities[0],
                availabilities[1],
                availabilities[3],
                availabilities[2]];
    const a4 = [availabilities[3],
                availabilities[2],
                availabilities[0],
                availabilities[1]];

    [a0, a1, a2, a3, a4].map((avail) => {
      expect(minimumAvailabilityStartTime(avail)).to.equal(expected);
    });
  })
});
