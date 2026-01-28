import type { Tweet, TweetFilter } from '@/types';

/** 좋아요 수 기준 보존 필터: minLikes 이상인 트윗을 보존 */
export function createLikesFilter(minLikes: number): TweetFilter {
  return {
    id: 'likes',
    type: 'likes',
    enabled: true,
    apply: (tweets: Tweet[]) => tweets.filter((t) => t.likes >= minLikes),
  };
}
