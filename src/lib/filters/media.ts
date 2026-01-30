import type { Tweet, TweetFilter } from '@/types';
import type { MediaFilterConfig } from './types';
import { applyNegate } from './types';

/** 미디어 필터 생성 */
export function createMediaFilter(config: MediaFilterConfig): TweetFilter {
  const { mediaType, negate } = config;

  return {
    id: 'media',
    type: 'media',
    enabled: true,
    apply: (tweets: Tweet[]) => {
      const kept = tweets.filter((t) => {
        const hasMedia = t.media && t.media.length > 0;

        switch (mediaType) {
          case 'any':
            // 미디어가 있는 트윗
            return hasMedia;
          case 'none':
            // 미디어가 없는 트윗
            return !hasMedia;
          case 'photo':
            // 사진이 포함된 트윗
            return t.media?.some((m) => m.type === 'photo') ?? false;
          case 'video':
            // 동영상이 포함된 트윗 (animated_gif 포함)
            return (
              t.media?.some(
                (m) => m.type === 'video' || m.type === 'animated_gif',
              ) ?? false
            );
          default:
            return false;
        }
      });

      return applyNegate(kept, tweets, negate);
    },
  };
}
