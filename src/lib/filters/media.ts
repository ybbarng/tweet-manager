import type { Tweet, TweetFilter } from '@/types';
import type { HasPhotoFilterConfig, HasVideoFilterConfig } from './types';

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
