import {expect, test} from '@oclif/test';
import * as nock from 'nock';
import * as sinon from 'sinon';

import { POST, URLS } from '../src/http';
import * as utils from '../src/utils';
import { config, key, mockDeleteQMI, mockGetQMI, mockGetQMIs } from './test-utils';


const serializedQMIs = `ID          IP              STATUS
1           0.0.0.0         ACTIVE
`;

describe('query qmis where qcs qmis', () => {
  beforeEach(() => {
    mockGetQMIs();

  });

  test
  .stdout()
  .command(['qmis'])
  .it('should call qmis command with no arguments and verify command output', ctx => {
    expect(ctx.stdout).to.equal(serializedQMIs);
  });
});

describe('query qmis where qcs qmis with --id arg', () => {
  beforeEach(() => {
    mockGetQMI(1);
  });

  test
  .stdout()
  .command(['qmis', '--id', '1'])
  .it('should call qmis command with --id argument and verify command output', ctx => {
    expect(ctx.stdout).to.equal(serializedQMIs);
  });
});

describe('create a qmi', () => {
  let confirmDeleteQMIStub: sinon.SinonStub;
  const keypath = 'some-path';
  let getKeyStub: sinon.SinonStub;
  beforeEach(() => {
    confirmDeleteQMIStub = sinon.stub(utils, 'confirmDeleteQMI');
    confirmDeleteQMIStub.returns(new Promise((ok) => {
        ok(true);
    }));
    getKeyStub = sinon.stub(utils, 'getKey');
    getKeyStub.returns('some-key');
    nock(config.url)
      .post(URLS.qmis, (data: utils.QMIRequest) => {
        expect(data).to.eql({ public_key: key });
        return true;
      })
      .reply(201);
  });
  afterEach(() => {
    confirmDeleteQMIStub.restore();
    getKeyStub.restore();
  });

  test
  .stdout()
  .command(['qmis', '-c', '-k', keypath, '-z', 'UTC'])
  .it(`should call qmis -c -k ${keypath}`, ctx => {
    expect(ctx.stdout).to.equal(
      "QMI creation in progress. Type qcs qmis to view your QMIs.\n");
  });
});


describe('delete a qmi', () => {
  const id = 1;
  let confirmDeleteStub: sinon.SinonStub;
  beforeEach(() => {
    mockGetQMI(id);
    mockDeleteQMI(id);
    confirmDeleteStub = sinon.stub(utils, 'confirmDeleteQMI');
    confirmDeleteStub.returns(new Promise((ok) => ok(true)));
  });
  afterEach(() => {
    confirmDeleteStub.restore();
  });

  test
  .stdout()
  .command(['qmis', '-d', '-i', '1'])
  .it('should call qmis -d -i 1', ctx => {
    expect(ctx.stdout).to.equal("QMI deletion successful.\n");
  });
});

describe('test the qcs-admin qmi start/stop', () => {
  let postStub: sinon.SinonStub;
  beforeEach(() => {
      postStub = sinon.stub(POST, 'qmi');
      postStub.returns(new Promise((ok) => {
          ok();
      }));
  });
  afterEach(() => {
      postStub.restore();
  });

test
  .stdout()
  .command(['qmis', '--start', '-i', '19'])
  .it('should call POST qmi/qmiId/start', ctx => {
      postStub.calledOnceWith(19, 'start');
      expect(ctx.stdout).to.include("QMI successfully powered on");
  });

test
  .stdout()
  .command(['qmis', '--stop', '-i', '19'])
  .it('should call POST qmi/qmiId/stop', ctx => {
      postStub.calledOnceWith(19, 'stop');
      expect(ctx.stdout).to.include("QMI successfully powered off");
  });
});

