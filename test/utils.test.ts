import { expect } from 'chai';

import {
  convertDurationStringToSeconds,
  convertSecondsToDurationString,
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
