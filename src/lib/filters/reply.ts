import type { Tweet, TweetFilter } from '@/types';
import type { ReplyFilterConfig } from './types';
import { applyNegate } from './types';

/** 답글 필터 생성 */
export function createReplyFilter(config: ReplyFilterConfig): TweetFilter {
  const { isReply, negate } = config;

  return {
    id: 'reply',
    type: 'reply',
    enabled: true,
    apply: (tweets: Tweet[]) => {
      const kept = tweets.filter((t) => {
        // inReplyToId가 있으면 답글
        const tweetIsReply = !!t.inReplyToId;
        return isReply ? tweetIsReply : !tweetIsReply;
      });

      return applyNegate(kept, tweets, negate);
    },
  };
}
