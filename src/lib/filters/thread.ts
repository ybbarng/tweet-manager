import type { Tweet, TweetFilter } from '@/types';

/** 타래(스레드) 보존 필터: 지정된 대화에 속하는 트윗을 보존 */
export function createThreadFilter(preservedIds: string[]): TweetFilter {
  const idSet = new Set(preservedIds);

  return {
    id: 'thread',
    type: 'thread',
    enabled: true,
    apply: (tweets: Tweet[]) =>
      tweets.filter(t =>
        idSet.has(t.id) ||
        (t.conversationId && idSet.has(t.conversationId))
      ),
  };
}
