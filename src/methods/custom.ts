import { RequestInit } from 'undici';

import { getToken } from '../auth';
import fetch from '../fetch';

export default <T>(url: string, params?: Partial<RequestInit>): Promise<T> =>
  getToken().then(fetch(url, params));
