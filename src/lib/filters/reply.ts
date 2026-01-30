import type { Tweet, TweetFilter } from '@/types';
import type { ReplyFilterConfig } from './types';

/** 답글 필터 생성: 조건에 맞는 트윗을 삭제 대상으로 반환 */
export function createReplyFilter(config: ReplyFilterConfig): TweetFilter {
  const { isReply } = config;

  return {
    id: 'reply',
    type: 'reply',
    enabled: true,
    apply: (tweets: Tweet[]) => {
      return tweets.filter((t) => {
        // inReplyToId가 있으면 답글
        const tweetIsReply = !!t.inReplyToId;
        return isReply ? tweetIsReply : !tweetIsReply;
      });
    },
  };
}
