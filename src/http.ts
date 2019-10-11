import * as request from 'request-promise-native';
import { QCSConfig } from './config';
import logger from './logger';
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

let config: QCSConfig;
export const setConfig = (c: QCSConfig) => config = c;

export const URLS = {
  schedule: '/schedule',
  nextAvailable: '/schedule/next_available',
  scheduleOverlap: '/schedule/proposed-reservations-overlap',
  cancel: '/schedule',
  lattices: '/lattices',
  devices: '/devices',
  credits: '/users/credits',
  qmis: '/qmis',
  graphql: '/graphql',
};

export interface ErrorResponse {
  error_type: string;
  status: string;
  status_code?: number;
}
export type AvailabilitiesResponse = {availability: Availability[]} | ErrorResponse;
export type ReservationsResponse =
  | { reservations: Reservation[]; requested_reservations: Reservation[] }
  | ErrorResponse;
export interface LatticesByName { [name: string]: Lattice; }
export interface DevicesByName { [name: string]: Device; }
export type LatticesResponse = { lattices: LatticesByName } | ErrorResponse;
export type DevicesResponse = { devices: DevicesByName } | ErrorResponse;
export type QMIResponse = { qmi: QMI } | ErrorResponse;
export type QMIsResponse = { qmis: QMI[] } | ErrorResponse;

export interface GQLError {
  message: string;
  extensions?: ErrorResponse;
}

export interface GQLResponse<T> {
  data: T;
  errors: GQLError[];
}

export const graphql = async <T>(payload: object): Promise<GQLResponse<T>> => {
  const opts = {
    method: 'POST',
    uri: URLS.graphql,
    body: payload,
  };
  const { data, errors } = await config.request<GQLResponse<T>>(opts);
  if (someGQLErrorIsUserUnauthorized(errors)) {
    await config.refreshAuthToken();
    return config.request(opts);
  }
  return { data, errors };
};

export const graphqlWithErrorLogging = async <T>(payload: object): Promise<T | undefined> => {
  try {
    const { data, errors } = await graphql<T>(payload);
    if (errors && errors.length > 0) {
      logGQLErrors(errors);
      return;
    }
    return data;
  } catch (err) {
    await handleGQLError(err);
  }
};

export function _required_property(obj: {[key: string]: any}, prop: string) {
  if (!(prop in obj)) {
    throw new Error(`The server responded unexpected. Expected property '${prop}' to be present.`);
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
    const response = (await config.request({
      uri: URLS.schedule,
      body: {
        ids,
        user_emails: userEmails ? userEmails.map(e => e.toLowerCase()) : undefined,
        start_time: startTime,
        end_time: endTime,
      },
    })) as ReservationsResponse;
    return _required_property(response, 'reservations');
  },
  availability: async (availreq: AvailabilityRequest): Promise<Availability[]> => {
    const response = (await config.request({
      uri: URLS.nextAvailable,
      body: availreq,
    })) as AvailabilitiesResponse;

    return _required_property(response, 'availability');
  },
  credits: async (): Promise<Credits> => {
    return config.request({ uri: URLS.credits });
  },
  lattices: async (
    deviceName?: string,
    numQubits?: number,
  ): Promise<LatticesByName> => {
    try {
      const response = (await config.request({
        uri: URLS.lattices,
        body: {
          device_name: deviceName,
          num_qubits: numQubits,
        },
      })) as LatticesResponse;
      return _required_property(response, 'lattices');
    } catch (err) {
      const body = getErrorResponseBody(err);
      if (body !== undefined && body.error_type === 'lattices_not_found') {
        return {};
      }
      throw err;
    }
  },
  devices: async (deviceName?: string): Promise<DevicesByName> => {
    const response = (await config.request({
      uri: URLS.devices,
      body: {
        device_name: deviceName,
      },
    })) as DevicesResponse;

    return _required_property(response, 'devices');
  },
  qmi: async (id: number): Promise<QMI> => {
    const response = (await config.request({ uri: `${URLS.qmis}/${id}` })) as QMIResponse;
    return _required_property(response, 'qmi');
  },
  qmis: async (): Promise<QMI[]> => {
    const response = (await config.request({ uri: URLS.qmis })) as QMIsResponse;

    return _required_property(response, 'qmis');
  },
};

export const POST = {
  reserve: async (resReq: ReservationRequest): Promise<Reservation[]> => {
    const response = (await config.request({
      uri: URLS.schedule,
      method: 'POST',
      body: resReq,
    })) as ReservationsResponse;

    return _required_property(response, 'reservations');
  },
  qmis: async (qmisReq: QMIRequest): Promise<any> => {
    return config.request({
      uri: URLS.qmis,
      method: 'POST',
      body: qmisReq,
    });
  },
  qmi: async (
    qmiId: number, action: 'start' | 'stop', _body: any = undefined,
  ): Promise<void> => {
    return config.request({
      uri: `/qmis/${qmiId}/${action}`,
      method: 'POST',
    });
  },
};

export const DELETE = {
  schedule: async (reservationIds: number[]) => {
    return config.request({
      uri: URLS.schedule,
      method: 'DELETE',
      body: {
        reservation_ids: reservationIds,
      },
    });
  },
  qmis: async (id: number): Promise<any> => {
    return config.request({
      uri: `${URLS.qmis}/${id}`,
      method: 'DELETE',
    });
  },
};

/**
 * Server error handling
 * - We expect errors from Rest API to conform to ServerError.
 * - We expect GQL errors to be an array of errors with extensions
 *   of form ServerError[].
 * - requestWithDefaults will throw on any non-2xx response.
 * - CommandWithCatch will call handleServerErrorIfPossible to log
 *   server errors in user friendly way.
 */

const getErrorResponseBody = (err: any): ErrorResponse | undefined => {
  if (!err.response) {
    return;
  }
  const response = err.response as request.FullResponse;
  try {
    let serverError: ErrorResponse;
    if (typeof response.body === 'object') {
      serverError = response.body;
    } else if (response.body.error_type) {
      serverError = JSON.parse(response.body);
    } else {
      throw err;
    }
    serverError.status_code = response.statusCode;
    return serverError;
  } catch (errInner) {
    if (errInner instanceof SyntaxError) {
      return;
    }
    throw err;
  }
};


const handleGQLError = async (err: any) => {
  if (err.response) {
    const response: request.FullResponse = err.response;
    const { body } = response;
    if (!body) {
      logger.error(`Server failed with ${response.statusCode}.`);
      logger.error(response.body);
      throw err;
    } else if (body.errors && body.errors.length > 0) {
      logGQLErrors(body.errors);
      return;
    }
    logger.error('Unexpected server response.');
    logger.debug(`Status:\t${response.statusCode}`);
    logger.debug(JSON.stringify(body));
    return;
  }
  throw err;
};

export const handleServerErrorIfPossible = (err: any) => {
  const serverError = getErrorResponseBody(err);
  if (serverError) {
    logServerError(serverError);
    return;
  }
  throw err;
};

const logGQLErrors = (errors: GQLError[]) => errors.forEach((e: GQLError) => {
  if (!e.extensions) {
    logger.error(e.message);
    return;
  }
  logServerError(e.extensions);
});

const logServerError = (err: ErrorResponse) => {
  if (err.status) {
    logger.error(err.status);
  }
  if (err.status_code) {
    logger.debug(`Status:\t${err.status_code}`);
  }
  if (err.error_type) {
    logger.debug(`Type:\t${err.error_type}`);
  }
};


const someGQLErrorIsUserUnauthorized = (errors?: GQLError[]) => {
  if (errors) {
    return errors.some((e) => {
      if (e.extensions) {
        return e.extensions.error_type === 'user_unauthorized';
      }
      return false;
    });
  }
  return false;
};
