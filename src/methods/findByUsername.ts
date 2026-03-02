import { AuthManager } from '../auth';
import { PlatformAll, UUID } from '../typings';
import { getURL, getAvatars } from '../utils';

export interface IProfile {
  profileId: UUID;
  userId: UUID;
  idOnPlatform: UUID | string;
  platformType: PlatformAll;
  nameOnPlatform: string;
}
export interface IApiResponse {
  profiles: IProfile[];
}

export default (auth: AuthManager, platform: PlatformAll, username: string[]) =>
  auth.getToken()
    .then(auth.fetch<IApiResponse>(getURL.BYUSERNAME(platform, username)))
    .then(res => res.profiles.map(profile => ({
      id: profile.profileId,
      userId: profile.userId,
      idOnPlatform: profile.idOnPlatform,
      platform: profile.platformType,
      username: profile.nameOnPlatform,
      avatar: getAvatars(profile.userId)
    })));
