import cli from 'cli-ux';
import * as fs  from 'fs';
import * as moment from 'moment-timezone';
import * as os from 'os';
import * as path from 'path';

import { SerializeFormat } from './baseOptions';
import { POST } from './http';

const chrono = require('chrono-node');

export const yellow = '\x1b[33m';
export const red = '\x1b[31m';
export const reset = '\x1b[0m';
moment.tz.setDefault(moment.tz.guess());

/*
  General utilities
*/

export function parsePositiveInteger(
  str: string,
): number | undefined {
  const parsed = ~~str;
  return parsed > 0 ? parsed : undefined;
}

export function parseNonNegativeInteger(str: string): number | undefined {
  if (str === '0') return 0;
  return parsePositiveInteger(str);
}

export function parseValueOrValues(values: any): any[] {
  if (!isNaN(Number(values))) {
    // Return the value as a single-element list
    const value = values;
    return [value];
  }

  try {
    // Values is indeed a list of values
    const valuesArray = JSON.parse(values);
    return valuesArray;
  } catch (_) {
    // Values is probably just a single user, so return it as a one-element list
    // FIXME: Add more checks here, with readable error messages
    const value = values;
    return [value];
  }
}

export function convertDurationStringToSeconds(durationStr: string): number {
  const pattern =
    /^([0-9]+\.?[0-9]*)\s*(hours|hour|hrs|hr|h|minutes|minute|mins|min|m|seconds|second|secs|sec|s)\s*$/gim;
  const matchData = pattern.exec(durationStr);

  if (!matchData) {
    console.error('Improperly formatted duration.');
    return process.exit(1);
  }

  const quantity: number = parseFloat(matchData[1]);
  const units: string = matchData[2];
  let durationInSeconds: number;

  switch (units) {
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      durationInSeconds = quantity * 60 * 60;
      break;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      durationInSeconds = quantity * 60;
      break;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      durationInSeconds = quantity;
      break;
    default:
      durationInSeconds = 30 * 60;
  }

  return Math.floor(durationInSeconds);
}

export function convertSecondsToDurationString(seconds: number) {
  const secondsPerHour = 60 * 60;
  const secondsPerMinute = 60;

  if (seconds >= secondsPerHour) {
    const hours = seconds / secondsPerHour;
    return `${hours.toFixed(2)}h`;
  }

  if (seconds >= secondsPerMinute) {
    return `${(seconds / secondsPerMinute).toFixed(2)}m`;
  }

  return `${seconds.toFixed(2)}s`;
}

/**
 * Parses a naturally formatted string of text to a moment date object.
 *
 * @param dateString A naturally formatted date string (e.g., "now", "friday at 5pm",
 * "Dec 8 @ 2:15pm", "12/08/18 2:30 PST")
 * @param flag Optional string of CLI flag to give better error message.
 */
export function convertNaturalDateStringToMoment(
  dateString: string,
  flag?: string,
) {
  const sanitizedDateString = dateString.replace('@', 'at');
  const chronoResult = chrono.parse(sanitizedDateString, new Date());

  // We should only allow for single known results in the chrono parser.
  if (chronoResult.length <= 0 || chronoResult.length > 1) {
    console.error(
      `Improperly formatted date/time input.${flag ? ` for --${flag}` : ''}`,
    );
    return process.exit(1);
  }

  return moment(chronoResult[0].start.date());
}

export function dtFmt(d: Date) {
  return moment(d)
    .format('YYYY-MM-DD HH:mm zz')
    .padEnd(25);
}

/*
  Credits utilities
*/

export const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

export interface Credits {
  current_balance: number;
  submitted_usage: number;
  pending_balance: number;
  upcoming_usage: number;
  available_credit: number;
}

export function logCredits(credits: Credits) {
  const availableCredit = credits.available_credit / 100;
  let line = '';
  if (availableCredit <= 0) {
    if (availableCredit < 0) {
      line += `Current balance due for billing cycle: ${currencyFormatter.format(
        -availableCredit,
      )}`;
    } else {
      line += `Available credits: ${currencyFormatter.format(availableCredit)}`;
    }
  } else {
    line += `Available credits: ${currencyFormatter.format(
      availableCredit,
    )}`;
  }
  console.log(yellow + line + reset);
}

/*
  Devices & lattices utilities
*/

export type Qubits = { [devIdx: number]: number };

export interface Device {
  device_name: string;
  num_qubits: number;
  category: string;
  google_calendar_id: string;
  qpu_endpoint: string;
}

export interface Lattice {
  qubits: Qubits;
  device: any;
  device_name: string;
  lattice_name: string;
  price_per_minute: number;
}

export function serializeDevices(devices: { [name: string]: Device }, format: SerializeFormat = 'tabular') {
  if (format.indexOf('json') === 0) {
    return jsonStringify(devices, format);
  }
  if (Object.keys(devices).length < 1) return '\nNo devices found.\n';

  let str = '';
  Object.keys(devices).map(deviceName => {
    str += serializeDevice(deviceName);
  });
  return str;
}

export function serializeDevice(deviceName: string) {
  let str = '';
  str += 'DEVICE\n';
  str += `Name: ${deviceName}\n`;
  return str;
}

export function serializeLattice(latticeName: string, lattice: Lattice, format: SerializeFormat = 'tabular') {
  if (format.indexOf('json') === 0) {
    return jsonStringify(lattice, format);
  }
  let str = '';
  const qubits = Object.keys(lattice.qubits);
  const pricePerMin = currencyFormatter.format(lattice.price_per_minute / 100.);
  str += 'LATTICE\n';
  str += `Name: ${latticeName}\n`;
  str += `  Device: ${lattice.device_name}\n`;
  str += `  Number of qubits: ${qubits.length}\n`;
  str += `  Qubits: ${qubits}\n`;
  str += `  Price (per min.): ${pricePerMin}\n`;
  return str;
}

export function serializeLattices(lattices: { [name: string]: Lattice }, format: SerializeFormat = 'tabular') {
  if (format.indexOf('json') === 0) {
    return jsonStringify(lattices, format);
  }
  if (Object.keys(lattices).length === 0) return '\nNo lattices found.\n';

  let str = '';
  Object.keys(lattices).map(latticeName => {
    str += serializeLattice(latticeName, lattices[latticeName]);
  });
  return str;
}

/*
  QMIs
*/

export interface QMI {
  id: number;
  openstack_status: {
    ip: string,
  };
  status: string;
}

export interface QMIRequest {
  public_key?: string;
}

export const QMITitles = `ID${' '.repeat(10)}IP${' '.repeat(14)}STATUS`;

export function serializeQMI(qmi: QMI, format: SerializeFormat = 'tabular') {
  if (format.indexOf('json') === 0) {
    return jsonStringify(qmi, format);
  }
  const ip = qmi.openstack_status && qmi.openstack_status.ip;
  return `${qmi.id.toString().padEnd(12)}${(ip || '').padEnd(16)}${qmi.status}`;
}

export function serializeQMIs(qmis: QMI[] | undefined, format: SerializeFormat = 'tabular') {
  if (format.indexOf('json') === 0) {
    return jsonStringify(qmis, format);
  }
  if (!qmis || qmis.length < 1) {
    return 'No QMIs found.';
  }

  let serialized = '';
  serialized += `${QMITitles}\n`;
  serialized += qmis.map((qmi: QMI) => serializeQMI(qmi));
  return serialized;
}

export function getKey(keypath: string): string {
  let pth = keypath;
  if (pth[0] === '~') {
    pth = path.join(os.homedir(), pth.slice(1));
  }
  return fs.readFileSync(pth, 'utf-8');
}

export async function confirmDeleteQMI(qmi: QMI): Promise<boolean> {
  console.log("Found 1 QMI for deletion:");
  console.log(serializeQMIs([qmi]));
  const typedIP = await cli.prompt(
    `\n${yellow}Alert! You have requested to delete your QMI. Are you absolutely sure?
Deleting your QMI will also delete your associated SSH keys. This action cannot be undone.
This will not affect your credits or realized usage, however it will cancel all current and
future reservations associated with this QMI.

${reset}To confirm deletion, please type the IP address of the QMI (or ctrl-C to cancel)`);
  const ip = qmi.openstack_status && qmi.openstack_status.ip;
  return typedIP === ip;
}

/*
  Reservations & availability utilities
*/

export interface Reservation {
  id: number;
  start_time: string;
  end_time: string;
  lattice_name: string;
  user_email?: string;
  duration: number;
  status?: string;
  price_booked: number;
}

export interface ReservationGetRequest {
  ids?: number[];
  userEmails?: string[];
  startTime?: object;
  endTime?: object;
}

export interface ReservationRequest {
  lattice_name: string;
  start_time: string;
  end_time: string;
  notes: string;
}

export interface Availability {
  start_time: string;
  end_time: string;
  lattice_name: string;
  expected_price: number;
}

export interface AvailabilityRequest {
  lattice_name?: string;
  start_time: string;
  duration: number;
}
const reservationTitles =
  'ID    START                    END                      DURATION  LATTICE            PRICE';
export const availabilityTitles =
  'START                    END                      DURATION  LATTICE            PRICE';
const currentHeader = 'CURRENTLY RUNNING COMPUTE BLOCKS';
const upcomingHeader = 'UPCOMING COMPUTE BLOCKS';


interface SerializeReservationOptions {
  titles?: string;
  format?: SerializeFormat;
  // tslint:disable-next-line
  serializeReservationHandler?: (arg0: Reservation) => string;
}

export function serializeReservations(
  reservations: Reservation[],
  {
    format = 'tabular',
    titles, serializeReservationHandler,
  }: SerializeReservationOptions = {},
) {
  if (format.indexOf('json') === 0) {
    return jsonStringify(reservations, format);
  }
  if (reservations.length === 0) {
    return 'No reservations found.';
  }

  const resTitles = titles ? titles : reservationTitles;

  const [current, upcoming] = separateCurrentUpcomingReservations(
    reservations,
  );

  let line = '';

  if (current.length > 0) {
    line += `${currentHeader}\n`;
    line += `${resTitles}\n`;
    current.map(reservation => {
      if (serializeReservationHandler) {
        line += serializeReservationHandler(reservation);
      } else {
        line += serializeReservation(reservation);
      }
    });
  }

  if (current.length > 0 && upcoming.length > 0) {
    line += '\n';
  }

  if (upcoming.length > 0) {
    line += `${upcomingHeader}\n`;
    line += `${resTitles}\n`;
    upcoming.map(reservation => {
      if (serializeReservationHandler) {
        line += serializeReservationHandler(reservation);
      } else {
        line += serializeReservation(reservation);
      }
    });
  }

  return line;
}

export function serializeReservation(reservation: Reservation, format: SerializeFormat = 'tabular') {
  if (format.indexOf('json') === 0) {
    return jsonStringify(reservation, format);
  }
  let line = '';
  const startTime = new Date(reservation.start_time);
  const endTime = new Date(reservation.end_time);
  const duration = (Number(endTime) - Number(startTime)) / 1e3;
  const estPrice = reservation.price_booked / 100;

  line += reservation.id.toString().padEnd(6);
  line += dtFmt(startTime);
  line += dtFmt(endTime);
  line += convertSecondsToDurationString(duration).padEnd(10);
  line += reservation.lattice_name.padEnd(19);
  line += currencyFormatter.format(estPrice);
  line += '\n';

  return line;
}

export function serializeAvailabilities(availabilities: Availability[], format: SerializeFormat = 'tabular') {
  if (format.indexOf('json') === 0) {
    return jsonStringify(availabilities, format);
  }
  // FIXME: Promises should have a reject path
  if (!availabilities || availabilities.length < 1) {
    return '\nThere is no upcoming compute availability. Please try again later.';
  }

  let line = '';
  line += availabilities.length > 1 ?
    `\nThe next available compute blocks are:\n\n` : `\nThe next available compute block is:\n\n`;
  // Only add the ID column if more than one available slot is present
  line += (availabilities.length > 1) ? 'ID'.padEnd(6) : '';
  line += `${availabilityTitles}\n`;
  availabilities.map((availability, idx) => {
    line += serializeAvailability(availability, (availabilities.length > 1) ? idx : undefined);
  });
  return line;
}

export function serializeAvailability(availability: Availability, idx?: number) {
  let line = '';
  const startTime = new Date(availability.start_time);
  const endTime = new Date(availability.end_time);
  const duration = (Number(endTime) - Number(startTime)) / 1e3;
  const estCost = availability.expected_price / 100;

  line += (idx || idx === 0) ? `${idx}`.padEnd(6) : '';
  line += dtFmt(startTime);
  line += dtFmt(endTime);
  line += convertSecondsToDurationString(duration).padEnd(10);
  line += availability.lattice_name.padEnd(19);
  line += currencyFormatter.format(estCost);
  line += '\n';

  return line;
}

export function separateCurrentUpcomingReservations(
  reservations: Reservation[],
) {
  const current: Reservation[] = [];
  const upcoming: Reservation[] = [];
  const now = new Date();

  reservations.map(reservation => {
    const startTime = new Date(reservation.start_time);
    if (startTime.getTime() <= now.getTime()) {
      current.push(reservation);
    } else {
      upcoming.push(reservation);
    }
  });
  return [current, upcoming];
}

export function makeAvailabilityRequest(
  startTime: string, duration: string, latticeName?: string): AvailabilityRequest {
  return {
    start_time: convertNaturalDateStringToMoment(startTime).toDate().toISOString(),
    duration: convertDurationStringToSeconds(duration),
    lattice_name: latticeName,
  };
}

export function makeReservationRequest(
  availabilityRequest: AvailabilityRequest, latticeName: string, notes: string): ReservationRequest {
  return {
    notes,
    lattice_name: latticeName,
    start_time: availabilityRequest.start_time,
    end_time: (new Date(Number(new Date(availabilityRequest.start_time)) +
      availabilityRequest.duration * 1e3)).toISOString(),
  };
}

export async function bookReservations(
  reservationRequest: ReservationRequest,
): Promise<string> {
  console.log('Booking reservation(s)...');
  const reservations = await POST.reserve(reservationRequest);
  if (reservations.length > 0) {
    return "Reservation(s) confirmed, run 'qcs reservations' to see the latest schedule.";
  }
  throw new Error(
    'request completed without confirmed reservations in response',
  );
}

export async function confirmReservationPrompt(numAvailabilities: number): Promise<number | string | undefined> {
  // FIXME: Promises should have a reject path
  const onePrompt = 'Accept? Type (y)es, (n)o to continue looking, or (q)uit';
  const manyPrompt = "Accept one of the above by typing its ID (or type 'n' to continue looking, or 'q' to quit)";
  const answer = await cli.prompt(numAvailabilities < 2 ? onePrompt : manyPrompt);

  // Handle 'y' or 0 scenario, which should be acceptable answers for one or multiple availabilities
  if (parseNonNegativeInteger(answer) === 0 || answer.charAt(0).toLowerCase() === 'y') return 0;

  // Handle multiple availabilities when answer is a valid non-negative number
  if (numAvailabilities > 1) {
    const num = parseNonNegativeInteger(answer);
    if (num && num > numAvailabilities - 1) {
      console.log(`ID value ${answer} is out of bounds from the IDs listed above, please select a valid ID.`);
      return confirmReservationPrompt(numAvailabilities);
    }
    if (num) return num;
  }

  // Handle single availability non-'y' scenarios
  let formattedAnswer = answer.charAt(0).toLowerCase();
  if (
    formattedAnswer !== 'n' &&
    formattedAnswer !== 'q'
  ) {
    const options = numAvailabilities > 1 ? "the ID of the availability to book" : "'y' to book";
    console.log(
      `Invalid response. Please enter a response of either ${options}, 'n' to continue looking, or 'q' to quit.`,
    );
    formattedAnswer = confirmReservationPrompt(numAvailabilities);
  }
  return formattedAnswer;
}

export async function confirmCancelReservationPrompt(): Promise<boolean> {
  return cli.confirm('\nCancel reservation(s)? (y)es, (N)o');
}

export function minimumAvailabilityStartTime(availabilities: Availability[]): string {
  return availabilities.reduce((min, a) => a.start_time < min ? a.start_time : min, availabilities[0].start_time);
}

export const jsonStringify = (obj: any, format: SerializeFormat) => {
  if (format === 'json') {
    return JSON.stringify(obj);
  }
  if (format === 'json-pretty') {
    return JSON.stringify(obj, undefined, 2);
  }
  throw Error(`jsonStringify only support json or json-pretty`);
};

export const pick = <T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> => {
  const ret: any = {};
  keys.forEach(key => {
    ret[key] = obj[key];
  });
  return ret;
};
