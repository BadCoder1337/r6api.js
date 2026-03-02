import { Agent, EnvHttpProxyAgent, ProxyAgent, Dispatcher } from 'undici';

import { Resolver } from 'dns';
import { tmpdir } from 'os';
import { join } from 'path';
import { promises as fs } from 'fs';

import _fetch from './fetch';
import { Platform, UUID } from './typings';
import { getURL } from './utils';
import { ubiAppId as defaultUbiAppId } from './constants';
import { RequestInit } from 'undici';

export interface IUbiAuth {
  platformType: Platform;
  ticket: string;
  twoFactorAuthenticationTicket: string | null;
  profileId: UUID;
  userId: UUID;
  nameOnPlatform: string;
  environment: string;
  expiration: string;
  spaceId: UUID;
  clientIp: string;
  clientIpCountry: string;
  serverTime: string;
  sessionId: UUID;
  sessionKey: string;
  rememberMeTicket: string;
}

const TEN_MIN_IN_MS = 10 * 60 * 1000;

const getExpiration = (auth: IUbiAuth) =>
  +new Date(auth.expiration) - +new Date() - TEN_MIN_IN_MS;

export class AuthManager {
  private credentials = { email: '', password: '' };
  private loginTimeout: any;
  ubiAppId: string = defaultUbiAppId;
  private _authFileDirPath: string = tmpdir();
  private _authFileName: string = 'r6api.js-auth.json';
  private _authFilePath: null | string = null;
  dispatcher: Dispatcher | undefined;

  login = async (): Promise<IUbiAuth> => {
    const lastAuth: IUbiAuth = await fs
      .readFile(this.getAuthFilePath(), 'utf8')
      .then(auth => JSON.parse(auth))
      .catch(() => '');
    if (lastAuth && getExpiration(lastAuth) > 0) {
      this.setNextLogin(lastAuth);
      return lastAuth;
    }

    const token =
      'Basic ' +
      Buffer.from(
        `${this.credentials.email}:${this.credentials.password}`,
        'utf8'
      ).toString('base64');

    return this.fetch<IUbiAuth>(getURL.LOGIN(), {
      method: 'POST',
      body: JSON.stringify({ rememberMe: true })
    })(token)
      .then(async res => {
        if (res && res.ticket && res.expiration) {
          await fs.writeFile(this.getAuthFilePath(), JSON.stringify(res));
          return res;
        } else throw new Error(`No response from login: ${JSON.stringify(res)}`);
      })
      .catch(err => {
        clearTimeout(this.loginTimeout);
        throw err;
      });
  };

  private setNextLogin = async (auth: IUbiAuth) => {
    clearTimeout(this.loginTimeout);
    this.loginTimeout = setTimeout(() => this.login(), getExpiration(auth));
  };

  getAuth = () => this.login();
  getTicket = () => this.login().then(auth => auth.ticket);
  getToken = () => this.login().then(auth => `Ubi_v1 t=${auth.ticket}`);

  setCredentials = (email: string, password: string) => {
    this.credentials.email = email;
    this.credentials.password = password;
  };
  setUbiAppId = (_ubiAppId: string) => {
    this.ubiAppId = _ubiAppId;
  };

  setAuthFileDirPath = (path: string) => {
    this._authFileDirPath = path;
  };
  setAuthFileName = (name: string) => {
    this._authFileName = `${name}.json`;
  };
  setAuthFilePath = (path: string) => {
    this._authFilePath = path;
  };
  getAuthFilePath = () =>
    this._authFilePath || join(this._authFileDirPath, this._authFileName);

  setEnvProxy = () => {
    this.dispatcher = new EnvHttpProxyAgent();
  };

  setProxyUrl = (url: string) => {
    this.dispatcher = new ProxyAgent(url);
  };

  setDnsServers = (servers: string[]) => {
    const resolver = new Resolver()
    resolver.setServers(servers)
    this.dispatcher = new Agent({
      connect: {
        lookup: (hostname, options, callback) => {
          resolver.resolve4(hostname, (err, addresses) => {
            if (err) return callback(err, '', 4)
            if (options.all) {
              return callback(null, addresses.map(addr => ({ address: addr, family: 4 })))
            }
            callback(null, addresses[0], 4)
          })
        }
      }
    })
  };

  fetch = <T>(url: string, options: Partial<RequestInit> = {}) =>
    _fetch<T>(url, options, this.ubiAppId, this.dispatcher);

  destroy = () => {
    clearTimeout(this.loginTimeout);
  };
}
