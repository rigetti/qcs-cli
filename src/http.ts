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

type PromiseRequestCallback = (ok: (value?: any) => void, err: (value?: any) => void) => request.RequestCallback;
/**
 * defaultHandler will return a request.RequestCallback which will resolve promise callbacks
 * according to expected HTTP response codes returned from server. request.RequestCallback
 * accepts an error, response, and response body. WARN: Some 2xx codes will
 * result in failure by default, such as 204 - in these cases write your own response handler.
 * @param ok Promise resolve callback.
 * @param err Promise failure callback.
 */
const defaultHandler: PromiseRequestCallback = (ok, err) => (e, r, b) => {
  if (e) {
    err('There was an error communicating with the server');
  } else {
    if (r.statusCode in KNOWN_CODES) {
      if (typeof (b) === 'object' || r.statusCode === 202) {
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
};

export async function _request<T = StatusResponse>(
  opts: Partial<request.Options> = {}, callback: PromiseRequestCallback = defaultHandler): Promise<T> {
  const options = {
    baseUrl: config.publicForestServer,
    json: true,
    headers: {
      'X-User-Id': config.userToken,
    },
    ...opts,
  } as request.Options;

  return new Promise((ok, err) => {
    request(options, callback(ok, err));
  });
}

export async function _get<T = StatusResponse>(
  uri: string, body: any = {}, callback: PromiseRequestCallback = defaultHandler): Promise<T> {
  return _request({ uri, body, method: 'get' }, callback);
}

export async function _post<T = StatusResponse>(
  uri: string, body: any = {}, callback: PromiseRequestCallback = defaultHandler): Promise<T> {
  return _request({ uri, body, method: 'post' }, callback);
}

export async function _delete<T = StatusResponse>(
  uri: string, body: any = {}, callback: PromiseRequestCallback = defaultHandler): Promise<T> {
  return _request({ uri, body, method: 'delete' }, callback);
}

export async function _put<T = StatusResponse>(
  uri: string, body: any = {}, callback: PromiseRequestCallback = defaultHandler): Promise<T> {
  return _request({ uri, body, method: 'put' }, callback);
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
  qmi: async (
    qmiId: number, action: 'start' | 'stop', body: any = undefined,
  ): Promise<request.Response> => {
    return _post<request.Response>(`/qmis/${qmiId}/${action}`, body, (ok, err) => (e, res, _body) => {
      if (e) {
        err(e);
        return;
      }
      ok(res);
    });
  },
};

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
