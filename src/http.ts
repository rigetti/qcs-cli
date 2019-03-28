import * as request from 'request';

import * as config from './config';
import {
  Availability,
  AvailabilityRequest,
  Credits,
  Device,
  Lattice,
  QMI,
  QMIRequest,
  Reservation,
  ReservationGetRequest,
  ReservationRequest,
} from './utils';

export const URLS = {
  schedule: '/schedule',
  nextAvailable: '/schedule/next_available',
  scheduleOverlap: '/schedule/proposed-reservations-overlap',
  cancel: '/schedule',
  lattices: '/lattices',
  devices: '/devices',
  credits: '/users/credits',
  qmis: '/qmis',
};

const KNOWN_CODES = { 200: 'OK', 201: 'Resource created', 202: 'Resource marked for deletion',
                      400: 'Bad request', 401: 'Unauthorized', 403: 'Resource forbidden',
                      404: 'Not found' } as { [key: number]: string };

type ErrorResponse = { error_type: string; status: string };
type StatusResponse = { status: string } | ErrorResponse;
export type AvailabilitiesResponse = {availability: Availability[]} | ErrorResponse;
export type ReservationsResponse =
  | { reservations: Reservation[]; requested_reservations: Reservation[] }
  | ErrorResponse;
export type LatticesByName = { [name: string]: Lattice };
export type LatticesResponse = { lattices: LatticesByName } | ErrorResponse;
export type DevicesByName = { [name: string]: Device };
export type DevicesResponse = { devices: DevicesByName } | ErrorResponse;
export type QMIResponse = { qmi: QMI } | ErrorResponse;
export type QMIsResponse = { qmis: QMI[] } | ErrorResponse;

export async function _request(path: string, data: any = {}, method: string) {
  const options = {
    method,
    url: config.publicForestServer + path,
    body: data,
    json: true,
    headers: {
      'X-User-Id': config.userToken,
    },
  };

  return new Promise((ok, err) => {
    request(options, (e, r, b) => {
      if (e) {
        err('There was an error communicating with the server');
      } else {
        if (r.statusCode in KNOWN_CODES) {
          if (typeof(b) === 'object' || r.statusCode === 202) {
            ok(b);
          } else if (r.statusCode === 201) {
            ok();
          } else if (r.statusCode >= 400) {
            err(KNOWN_CODES[r.statusCode]);
          } else {
            err('Server did not return a valid JSON response');
          }
        } else {
          err(`Server responded with unexpected status ${r.statusCode} ${r.statusMessage}`);
        }
      }
    });
  });
}

export async function _get(path: string, data: any = {}) {
  return await _request(path, data, 'get') as StatusResponse;
}

export async function _post(path: string, data: any = {}) {
  return await _request(path, data, 'post') as StatusResponse;
}

export function _required_property(obj: {[key: string]: any}, prop: string) {
  if (!(prop in obj)) {
    throw new Error(`Missing required property '${prop}'`);
  }

  return obj[prop];
}

export const GET = {
  schedule: async ({
    ids,
    userEmails,
    startTime,
    endTime,
  }: ReservationGetRequest = {}): Promise<Reservation[]> => {
    const response = (await _get(URLS.schedule, {
      ids,
      user_emails: userEmails ? userEmails.map(e => e.toLowerCase()) : undefined,
      start_time: startTime,
      end_time: endTime,
    })) as ReservationsResponse;
    if ('error_type' in response) {
      if (response.error_type === 'reservation_not_found') {
        return [];
      }

      throw new Error(`Server response: "${response.status}"`);
    } else {
      return _required_property(response, 'reservations');
    }
  },
  availability: async (availreq: AvailabilityRequest): Promise<Availability[]> => {
    const response = (await _get(URLS.nextAvailable, availreq)) as AvailabilitiesResponse;

    if ('error_type' in response) {
      throw new Error(`Server response: "${response.status}"`);
    }

    return _required_property(response, 'availability');
  },
  credits: async (): Promise<Credits> => {
    type CreditsResponse = Credits | ErrorResponse;
    const response = (await _get(URLS.credits)) as CreditsResponse;
    if ('error_type' in response) {
      throw new Error(`Server response: "${response.status}"`);
    } else {
      return response;
    }
  },
  lattices: async (
    deviceName?: string,
    numQubits?: number,
  ): Promise<LatticesByName> => {
    const response = (await _get(URLS.lattices, {
      device_name: deviceName,
      num_qubits: numQubits,
    })) as LatticesResponse;
    if ('error_type' in response) {
      if (response.error_type === 'lattices_not_found') {
        return {};
      }

      throw new Error(`Server response: "${response.status}"`);
    } else {
      return _required_property(response, 'lattices');
    }
  },
  devices: async (deviceName?: string): Promise<DevicesByName> => {
    const response = (await _get(URLS.devices, {
      device_name: deviceName,
    })) as DevicesResponse;
    if ('error_type' in response) {
      throw new Error(`Server response: "${response.status}"`);
    } else {
      return _required_property(response, 'devices');
    }
  },
  qmi: async (id: number): Promise<QMI> => {
    const response = (await _get(`${URLS.qmis}/${id}`)) as QMIResponse;
    if ('error_type' in response) {
      throw new Error(`Server response: "${response.status}"`);
    }
    return _required_property(response, 'qmi');
  },
  qmis: async (): Promise<QMI[]> => {
    const response = (await _get(URLS.qmis)) as QMIsResponse;

    if ('error_type' in response) {
      throw new Error(`Server response: "${response.status}"`);
    }

    return _required_property(response, 'qmis');
  },
};

export const POST = {
  reserve: async (resReq: ReservationRequest): Promise<Reservation[]> => {
    const response = (await _post(URLS.schedule, resReq)) as ReservationsResponse;

    if ('error_type' in response) {
      throw new Error(`Server response: "${response.status}"`);
    } else {
      return _required_property(response, 'reservations');
    }
  },
  qmis: async (qmisReq: QMIRequest): Promise<any> => {
    const response = await _post(URLS.qmis, qmisReq);
    if (response && 'error_type' in response) {
      throw new Error(`Server response: "${response.status}"`);
    }
  },
};

export async function _delete(path: string, data: any = {}) {
  return await _request(path, data, 'delete') as StatusResponse;
}

export const DELETE = {
  schedule: async (reservationIds: number[]) => {
    const response = await _delete(URLS.schedule, {
      reservation_ids: reservationIds,
    });
    if (response && 'error_type' in response) {
      throw new Error(`server says "${response.status}"`);
    }
  },
  qmis: async (id: number): Promise<any> => {
    const response = await _delete(`${URLS.qmis}/${id}`);
    if (response && 'error_type' in response) {
      throw new Error(`Server response: "${response.status}"`);
    }
  },
};
