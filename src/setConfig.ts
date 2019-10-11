// tslint:disable-next-line
import { QCSConfig } from './config';
import { setConfig } from './http';

export default async () => {
  setConfig(new QCSConfig());
};
