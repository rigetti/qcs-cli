import { expect } from 'chai';
import * as nock from 'nock';

import { QCSConfig } from '../src/config';
import {
         AvailabilitiesResponse,
         DevicesByName,
         DevicesResponse,
         LatticesByName,
         LatticesResponse,
         QMIResponse,
         QMIsResponse,
         setConfig as setHTTPConfig,
         URLS } from '../src/http';
import {
  Availability,
  AvailabilityRequest,
  Credits,
  Device,
  dtFmt,
  Lattice,
  Reservation,
  ReservationRequest,
} from '../src/utils';

export let config: QCSConfig;
export const setConfig = (c: QCSConfig) => {
  config = c;
  setHTTPConfig(c);
};
setConfig(new QCSConfig());

export { nock };

/*
  Credits
*/

export const creditsResponse = {
  current_balance: 1000,
  submitted_usage: 100,
  pending_balance: 900,
  upcoming_usage: 100,
  available_credit: 800,
} as Credits;

export function mockGetCredits() {
  return nock(config.url)
    .get(URLS.credits)
    .reply(200, creditsResponse);
}

/*
  Devices
*/

export const testDevice = {
  device_name: 'test-device',
  num_qubits: 16,
  category: 'test-category',
} as Device;

const deviceByName = {
  'test-device': testDevice,
} as DevicesByName;

export const devicesResponse = {
  'devices': deviceByName,
} as DevicesResponse;

export function mockGetDevices() {
  return nock(config.url)
    .get(URLS.devices)
    .reply(200, devicesResponse);
}

/*
  Lattices
*/

export const testLattice = {
  qubits: {2: 2},
  device: 'some-device',
  device_name: 'some-device-name',
  lattice_name: 'test-lattice',
  price_per_minute: 100,
} as Lattice;

const latticeByName = {
  'test-lattice': testLattice,
} as LatticesByName;

export const latticesResponse = {
  'lattices': latticeByName,
} as LatticesResponse;

export function mockGetLattices() {
  return nock(config.url)
    .get(URLS.lattices)
    .reply(200, latticesResponse);
}

/*
  QMIs
*/

export const key = 'some-key';
const qmi = { id: 1, openstack_status: { ip: '0.0.0.0' }, status: 'ACTIVE'};
const qmiResponse = { qmi } as QMIResponse;
const qmisResponse = { qmis: [qmi] } as QMIsResponse;

export function mockGetQMIs() {
  return nock(config.url)
    .get(URLS.qmis)
    .reply(200, qmisResponse);
}

export function mockGetQMI(id: number) {
  nock(config.url)
    .get(`${URLS.qmis}/${id}`)
    .reply(200, qmiResponse);
}

export function mockDeleteQMI(id: number) {
  return nock(config.url)
    .delete(`${URLS.qmis}/${id}`)
    .reply(202);
}

/*
  Reservations & Availability
*/

export const startTime = '2019-01-15T14:30:00.000Z';
export const startTimeDate = dtFmt(new Date(startTime));
const endTime = '2019-01-15T15:30:00.000Z';
export const endTimeDate = dtFmt(new Date(endTime));
export const reservationNotes = 'Running some Rabi experiments.';
export const latticeName = 'test-lattice';

export const reservationsList: Reservation[] = [{
  id: 0,
  user_email: 'isidor.rabi@bloch.org',
  lattice_name: latticeName,
  start_time: startTime,
  end_time: endTime,
  status: 'ACTIVE',
  duration: 100,
  price_booked: 100,
}];

export const reservationRequest = {
  lattice_name: latticeName,
  start_time: startTime,
  end_time: endTime,
  notes: reservationNotes,
} as ReservationRequest;

export const reservationsResponse = {
  'reservations': reservationsList,
};

export const availabilityRequest = {
  lattice_name: 'test-lattice',
  start_time: startTime,
  duration: 3600,
} as AvailabilityRequest;

export const availability = {
  lattice_name: availabilityRequest.lattice_name,
  start_time: availabilityRequest.start_time,
  end_time: (new Date(Number(new Date(availabilityRequest.start_time)) +
    availabilityRequest.duration * 1e3)).toISOString(),
  expected_price: 100,
} as Availability;

export const availabilitiesResponse = {
  availability: [availability],
} as AvailabilitiesResponse;

export const twoAvailabilitiesResponse = {
  availability: [availability, availability],
} as AvailabilitiesResponse;

export function mockGetAvailability() {
  return nock(config.url)
    .get(URLS.nextAvailable)
    .reply(200, availabilitiesResponse);
}

export function mockGetAvailabilityReturnTwo() {
  return nock(config.url)
    .get(URLS.nextAvailable)
    .reply(200, twoAvailabilitiesResponse);
}

export function mockGetReservations() {
    return nock(config.url)
      .get(URLS.schedule)
      .reply(200, reservationsResponse);
}

export function mockDeleteReservations() {
    return nock(config.url)
      .delete(URLS.schedule)
      .reply(202);
}

export function mockPostReservations(expectedData: ReservationRequest) {
  return nock(config.url)
    .post(URLS.schedule, (data: ReservationRequest) => {
      expect(data).to.eql(expectedData);
      return true;
    })
    .reply(200, reservationsResponse);
}
