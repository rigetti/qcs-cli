import {expect, test} from '@oclif/test';
import * as sinon from 'sinon';

import * as utils from '../src/utils';

import { key, mockDeleteQMI, mockGetQMI, mockGetQMIs, mockPostQMI } from './test-utils';

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
  beforeEach(() => {
    mockPostQMI();
  });

  const keypath = 'some-path';
  const getKeyStub = sinon.stub(utils, 'getKey');
  getKeyStub.withArgs(keypath).returns(key);

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

  beforeEach(() => {
    mockGetQMI(id);
    mockDeleteQMI(id);
  });

  const confirmDeleteStub = sinon.stub(utils, 'confirmDeleteQMI');
  confirmDeleteStub.returns(new Promise((ok) => ok(true)));

  test
  .stdout()
  .command(['qmis', '-d', '-i', '1'])
  .it('should call qmis -d -i 1', ctx => {
    expect(ctx.stdout).to.equal("QMI deletion successful.\n");
  });
});
