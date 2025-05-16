import { RequestInit, Response, fetch } from 'undici';

import { IUbiAuth, ubiAppId, proxyAgent } from './auth';

const promiseTimeout = <T>(promise: Promise<T>, ms: number, reject = true) =>
  Promise.race([
    promise,
    new Promise((res, rej) => setTimeout(() => (reject ? rej : res), ms))
  ]);

export default <T>(url: string, options: Partial<RequestInit> = {}) =>
  async (token?: string, auth?: IUbiAuth): Promise<T> => {
    const { headers, ...optionsRest } = options;

    const response = await fetch(url, {
      ...{
        method: 'GET',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Ubi-AppId': ubiAppId,
          ...(token && { Authorization: token }),
          ...(headers && { ...headers }),
          ...(auth && {
            'Ubi-SessionId': auth.sessionId
          })
        }
      },
      ...(optionsRest && { ...optionsRest }),
      dispatcher: proxyAgent
    });

    const handleResponse = async (res: Response) => {
      if (res.ok) return res.json();
      else {
        const body = await res.text();
        let json;
        try {
          json = JSON.parse(body);
        } catch (error) {
          throw new Error(`${res.status} ${res.statusText}`);
        }
        throw new Error(
          json.httpCode || json.message
            ? `${json.httpCode} ${json.message}${
                json.moreInfo ? `\n\n${json.moreInfo}` : ''
              }`
            : JSON.stringify(json)
        );
      }
    };

    return promiseTimeout(
      handleResponse(response).catch(err => {
        if (
          err instanceof Error &&
          err.message.includes('Too many calls per IP address.')
        ) {
          console.error(err);
          process.exit(1);
        }
        throw err;
      }),
      10000
    ) as Promise<T>;
  };
