import type { Tweet, TweetFilter } from '@/types';

/**
 * 필터 엔진: 여러 필터를 OR 조합으로 실행.
 * 하나라도 보존 조건에 해당하면 보존, 아무 필터에도 해당 안 되면 삭제 대상.
 */
export function getPreservedTweets(tweets: Tweet[], filters: TweetFilter[]): Set<string> {
  const preserved = new Set<string>();
  const enabledFilters = filters.filter(f => f.enabled);

  // 활성 필터가 없으면 전체 보존 (삭제 대상 없음)
  if (enabledFilters.length === 0) {
    tweets.forEach(t => preserved.add(t.id));
    return preserved;
  }

  for (const filter of enabledFilters) {
    const kept = filter.apply(tweets);
    kept.forEach(t => preserved.add(t.id));
  }

  return preserved;
}

/** 삭제 대상 트윗 반환 */
export function getTweetsToDelete(
  tweets: Tweet[],
  filters: TweetFilter[],
  excludedIds: Set<string>,
): Tweet[] {
  const preserved = getPreservedTweets(tweets, filters);

  return tweets.filter(t =>
    !preserved.has(t.id) && !excludedIds.has(t.id)
  );
}
