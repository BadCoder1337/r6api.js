import { AuthManager } from './auth';
import _findByUsername from './methods/findByUsername';
import _findById, { IOptions as IFindByIdOptions } from './methods/findById';
import _getProgression from './methods/getProgression';
import _getPlaytime from './methods/getPlaytime';
import _getRanks, { IOptions as IGetRanksOptions } from './methods/getRanks';
import _getUserSeasonalv2 from './methods/getUserSeasonalv2';
import _getStats, { IOptions as IGetStatsOptions } from './methods/getStats';
import _getStatus from './methods/getStatus';
import _getUserStatus, {
  IOptions as IGetUserStatusOptions
} from './methods/getUserStatus';
import _getProfileApplications, {
  IOptions as IGetProfileApplicationsOptions
} from './methods/getProfileApplications';
import _getApplications from './methods/getApplications';
import _validateUsername from './methods/validateUsername';
import _custom from './methods/custom';
import _getNews from './methods/getNews';
import _getNewsById from './methods/getNewsById';
import { UUID, Platform, PlatformAll, PlatformAllExtended } from './typings';

export { default as fetch } from './fetch';
export { AuthManager } from './auth';
export type { IUbiAuth } from './auth';
export * as typings from './typings';
export * as constants from './constants';
export * as utils from './utils';

const checkQueryLimit = <T extends (...args: any) => any>({
  method,
  platform,
  query,
  options,
  limit
}: {
  method: T;
  platform?: PlatformAllExtended;
  query: QueryUUID | QueryString;
  options?: any;
  limit: number;
}): ReturnType<T> => {
  const queryArray = Array.isArray(query) ? query : [query];
  if (queryArray.length > limit)
    return Promise.reject(
      new TypeError(`You can't pass more than ${limit} ids/usernames`)
    ) as ReturnType<T>;
  return platform
    ? method(platform, queryArray, options)
    : method(queryArray, options);
};

type QueryUUID = UUID | UUID[];
type QueryString = string | string[];

export default class R6API {
  auth: AuthManager;

  constructor(options: {
    email?: string;
    password?: string;
    ubiAppId?: string;
    proxyUrl?: string;
    dnsServers?: string[];
    authFileDirPath?: string;
    authFileName?: string;
    authFilePath?: string;
    useProxy?: boolean;
  }) {
    this.auth = new AuthManager();
    if (options.email && options.password)
      this.auth.setCredentials(options.email, options.password);
    if (options.ubiAppId) this.auth.setUbiAppId(options.ubiAppId);
    if (options.proxyUrl) this.auth.setProxyUrl(options.proxyUrl);
    else if (options.useProxy) this.auth.setEnvProxy();
    else if (options.dnsServers) this.auth.setDnsServers(options.dnsServers);
    if (options.authFileDirPath) this.auth.setAuthFileDirPath(options.authFileDirPath);
    if (options.authFileName) this.auth.setAuthFileName(options.authFileName);
    if (options.authFilePath) this.auth.setAuthFilePath(options.authFilePath);
    this.auth.fetch('https://api.ipify.org?format=json')().then(data =>
      console.log('External IP Address:', data)
    );
  }

  /** Find player by their username. */
  findByUsername = (platform: PlatformAll, query: QueryString) =>
    checkQueryLimit({ method: _findByUsername.bind(null, this.auth), platform, query, limit: 50 });

  /** Find player by their id. */
  findById = (
    platform: PlatformAllExtended,
    query: QueryUUID | QueryString,
    options?: IFindByIdOptions
  ) =>
    checkQueryLimit({ method: _findById.bind(null, this.auth), platform, query, options, limit: 50 });

  /** Get playtime of a player. */
  getPlaytime = (platform: Platform, query: QueryUUID) =>
    checkQueryLimit({ method: _getPlaytime.bind(null, this.auth), platform, query, limit: 200 });

  /** Get level, xp and alpha pack drop chance of a player. */
  getProgression = (platform: Platform, query: QueryUUID) =>
    checkQueryLimit({ method: _getProgression.bind(null, this.auth), platform, query, limit: 200 });

  /** Get seasonal stats of a player. */
  getRanks = (
    platform: Platform,
    query: QueryUUID,
    options?: IGetRanksOptions
  ) =>
    checkQueryLimit({
      method: _getRanks.bind(null, this.auth),
      platform,
      query,
      options,
      limit: 200
    });

  getUserSeasonalv2 = (query: QueryUUID) =>
    checkQueryLimit({ method: _getUserSeasonalv2.bind(null, this.auth), query, limit: 200 });

  /** Get summary stats of a player. */
  getStats = (
    platform: Platform,
    query: QueryUUID,
    options?: IGetStatsOptions
  ) =>
    checkQueryLimit({
      method: _getStats.bind(null, this.auth),
      platform,
      query,
      options,
      limit: 200
    });

  /** Get Rainbow Six: Siege servers status. */
  getStatus = () => _getStatus(this.auth);
  /** Get status of a player. */
  getUserStatus = (query: QueryUUID, options?: IGetUserStatusOptions) =>
    checkQueryLimit({ method: _getUserStatus.bind(null, this.auth), query, options, limit: 50 });
  /** Get information about applications of a player. */
  getProfileApplications = (
    query: QueryUUID,
    options?: IGetProfileApplicationsOptions
  ) =>
    checkQueryLimit({
      method: _getProfileApplications.bind(null, this.auth),
      query,
      options,
      limit: 100
    });
  /** Get information about applications. */
  getApplications = (query: QueryUUID) =>
    checkQueryLimit({ method: _getApplications.bind(null, this.auth), query, limit: 50 });
  /** Validate username. */
  validateUsername = (username: string) => _validateUsername(this.auth, username);
  /** Useful if you're familiar with Rainbow Six Siege's API; this method will make a request to a custom URL you would provide with the token in the header. */
  custom = <T>(url: string, params?: Parameters<typeof _custom>[2]) => _custom<T>(this.auth, url, params);
  /** Get Rainbow Six: Siege News. */
  getNews = (options?: Parameters<typeof _getNews>[1]) => _getNews(this.auth, options);
  /** Get Rainbow Six: Siege News by ID. */
  getNewsById = (id: string, options?: Parameters<typeof _getNewsById>[2]) => _getNewsById(this.auth, id, options);

  getAuth = () => this.auth.getAuth();
  getTicket = () => this.auth.getTicket();
  getToken = () => this.auth.getToken();
  setCredentials = (email: string, password: string) => this.auth.setCredentials(email, password);
  setUbiAppId = (ubiAppId: string) => this.auth.setUbiAppId(ubiAppId);
  setAuthFileDirPath = (path: string) => this.auth.setAuthFileDirPath(path);
  setAuthFileName = (name: string) => this.auth.setAuthFileName(name);
  setAuthFilePath = (path: string) => this.auth.setAuthFilePath(path);
  getAuthFilePath = () => this.auth.getAuthFilePath();
  setDnsServers = (servers: string[]) => this.auth.setDnsServers(servers);

  destroy = () => this.auth.destroy();
}
