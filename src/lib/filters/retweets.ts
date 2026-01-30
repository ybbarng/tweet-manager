import type { Tweet, TweetFilter } from '@/types';

/**
 * 리트윗 수 기준 보존 필터: minRetweets 이상인 트윗을 보존
 * @deprecated createNumericFilter 사용 권장 (비교 연산자, NOT 지원)
 */
export function createRetweetsFilter(minRetweets: number): TweetFilter {
  return {
    id: 'retweets',
    type: 'retweets',
    enabled: true,
    apply: (tweets: Tweet[]) => tweets.filter((t) => t.retweets >= minRetweets),
  };
}
