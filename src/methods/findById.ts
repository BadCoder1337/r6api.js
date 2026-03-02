import { AuthManager } from '../auth';
import { PlatformAllExtended, UUID, IOptionsDocs } from '../typings';
import { getURL, getAvatars } from '../utils';

export interface IProfile {
  profileId: UUID;
  userId: UUID;
  idOnPlatform: UUID | string;
  platformType: PlatformAllExtended;
  nameOnPlatform: string;
}
export interface IApiResponse {
  profiles: IProfile[];
}

export interface IOptions {
  isUserId?: boolean;
}

export const optionsDocs: IOptionsDocs = [
  [
    'isUserId', '`boolean`', false, '`false`', 'Whether `id` is `userId` or not'
  ]
];

export default (auth: AuthManager, platform: PlatformAllExtended, ids: UUID[] | string[], options?: IOptions) =>

  auth.getToken()
    .then(
      platform === 'all'
        ? options && options.isUserId
          ? auth.fetch<IApiResponse>(getURL.BYUSERID(ids))
          : auth.fetch<IApiResponse>(getURL.BYPROFILEID(ids))
        : auth.fetch<IApiResponse>(getURL.BYIDONPLATFORM(platform, ids))
    )
    .then(res =>
      res.profiles
        .map(profile => ({
          id: profile.profileId,
          userId: profile.userId,
          idOnPlatform: profile.idOnPlatform,
          platform: profile.platformType,
          username: profile.nameOnPlatform,
          avatar: getAvatars(profile.userId)
        }))
    );
