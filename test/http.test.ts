import { expect } from 'chai';
import * as nock from 'nock';

import { DELETE,
         GET,
         POST,
         QMIsResponse,
         URLS } from '../src/http';
import {
  QMIRequest,
  Reservation,
} from '../src/utils';
import { availabilitiesResponse,
         availabilityRequest,
         config,
         creditsResponse,
         devicesResponse,
         latticesResponse,
         mockDeleteReservations,
         mockGetAvailability,
         mockGetCredits,
         mockGetDevices,
         mockGetLattices,
         mockGetReservations,
         mockPostReservations,
         reservationRequest,
         reservationsList,
} from './test-utils';

/*
  GET /reservations
*/

describe('that true should be true', () => {
  it('should check that true is true', () => {
    expect(true).to.equal(true);
  });
});

describe('test the GET /reservations api', () => {
  beforeEach(() => {
    mockGetReservations();
  });

  it('should get reservations back from the GET /schedule route', async () => {
    const reservations = await GET.schedule() as Reservation[];
    reservationsList.forEach((res, idx) => {
      expect(res).to.eql(reservations[idx]);
    });
  });
});

/*
  GET /availability
*/

describe('test the GET /availability api', () => {
  beforeEach(() => {
    mockGetAvailability();
  });

  it('should get availability back from the GET /availability route', async () => {
    const availability = await GET.availability(availabilityRequest);
    expect(availability).to.eql(availabilitiesResponse.availability);
  });
});

/*
  GET /credits
*/

describe('test the GET /credits api', () => {
  beforeEach(() => {
    mockGetCredits();
  });

  it('should get availability back from the GET /availability route', async () => {
    const credits = await GET.credits();
    expect(credits).to.eql(creditsResponse);
  });
});

/*
  GET /lattices
*/



describe('test the GET /lattices api', () => {
  beforeEach(() => {
    mockGetLattices();
  });

  it('should get lattices back from the GET /lattices route', async () => {
    const lattices = await GET.lattices();
    expect(lattices).to.eql(latticesResponse.lattices);
  });
});

/*
  GET /devices
*/

describe('test the GET /devices api', () => {
  beforeEach(() => {
    mockGetDevices();
  });

  it('should get devices back from the GET /devices route', async () => {
    const devices = await GET.devices();
    expect(devices).to.eql(devicesResponse.devices);
  });
});

/*
  GET /qmis
*/

const qmisResponse = { qmis: [
  {id: 1, ip: '0.0.0.0', status: 'ACTIVE'},
  ],
} as QMIsResponse;

describe('test the GET /qmis api', () => {
  beforeEach(() => {
    nock(config.url)
      .get(URLS.qmis)
      .reply(200, qmisResponse);
  });

  it('should get qmis back from the GET /qmis route', async () => {
    const qmis = await GET.qmis();
    expect(qmis).to.eql(qmisResponse.qmis);
  });
});

/*
  POST /reservations
*/

describe('test the POST /reservations api', () => {
  beforeEach(() => {
    mockPostReservations(reservationRequest);
  });

  it('should post a reservation and receive it back from the POST /schedule route', async () => {
    const reservations = await POST.reserve(reservationRequest);
    reservations.forEach((res, idx) => {
      expect(res).to.eql(reservationsList[idx]);
    });
  });
});

/*
  POST /qmis
*/

const qmiRequest = {
  public_key: 'test-key',
};

describe('test the POST /qmis api', () => {
  beforeEach(() => {
    nock(config.url)
      .post(URLS.qmis, (data: QMIRequest) => {
        expect(data).to.eql(qmiRequest);
        return true;
      })
      .reply(201);
  });

  it('should post a qmi and receive back a 201 from the POST /qmis route', async () => {
    await POST.qmis(qmiRequest);
  });
});

/*
  DELETE /reservations
*/

const reservationDeleteRequest = {
  reservation_ids: [1],
};

describe('test the DELETE /reservations api', () => {
  beforeEach(() => {
    mockDeleteReservations();
  });

  it('should delete a reservation and receive back a 202 from the DELETE /schedule route', async() => {
    await DELETE.schedule(reservationDeleteRequest.reservation_ids);
  });
});
