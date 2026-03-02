import { RequestInit } from 'undici';

import { AuthManager } from '../auth';

export default <T>(auth: AuthManager, url: string, params?: Partial<RequestInit>): Promise<T> =>
  auth.getToken().then(auth.fetch(url, params));
