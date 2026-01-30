import type { Tweet, TweetFilter } from '@/types';

/** 사진 포함 여부 필터 설정 */
export interface HasPhotoFilterConfig {
  type: 'hasPhoto';
  /** true: 사진 있는 트윗, false: 사진 없는 트윗 */
  hasPhoto: boolean;
}

/** 동영상 포함 여부 필터 설정 */
export interface HasVideoFilterConfig {
  type: 'hasVideo';
  /** true: 동영상 있는 트윗, false: 동영상 없는 트윗 */
  hasVideo: boolean;
}

/** 사진 포함 여부 필터 생성 */
export function createHasPhotoFilter(
  config: HasPhotoFilterConfig,
): TweetFilter {
  const { hasPhoto } = config;

  return {
    id: 'hasPhoto',
    type: 'hasPhoto',
    enabled: true,
    apply: (tweets: Tweet[]) => {
      return tweets.filter((t) => {
        const tweetHasPhoto = t.media?.some((m) => m.type === 'photo') ?? false;
        return hasPhoto ? tweetHasPhoto : !tweetHasPhoto;
      });
    },
  };
}

/** 동영상 포함 여부 필터 생성 */
export function createHasVideoFilter(
  config: HasVideoFilterConfig,
): TweetFilter {
  const { hasVideo } = config;

  return {
    id: 'hasVideo',
    type: 'hasVideo',
    enabled: true,
    apply: (tweets: Tweet[]) => {
      return tweets.filter((t) => {
        const tweetHasVideo =
          t.media?.some(
            (m) => m.type === 'video' || m.type === 'animated_gif',
          ) ?? false;
        return hasVideo ? tweetHasVideo : !tweetHasVideo;
      });
    },
  };
}
