import type { Tweet, TweetFilter } from '@/types';

/**
 * 필터 엔진: 여러 필터를 OR 조합으로 실행.
 * 하나라도 보존 조건에 해당하면 보존, 아무 필터에도 해당 안 되면 삭제 대상.
 */
export function getPreservedTweets(
  tweets: Tweet[],
  filters: TweetFilter[],
): Set<string> {
  const preserved = new Set<string>();
  const enabledFilters = filters.filter((f) => f.enabled);

  // 활성 필터가 없으면 전체 삭제 후보 (사용자가 수동으로 보존 선택)
  if (enabledFilters.length === 0) {
    return preserved; // 빈 Set 반환 = 보존할 트윗 없음
  }

  for (const filter of enabledFilters) {
    const kept = filter.apply(tweets);
    for (const t of kept) {
      preserved.add(t.id);
    }
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

  return tweets.filter((t) => !preserved.has(t.id) && !excludedIds.has(t.id));
}

/** 삭제 후보 트윗 반환 (수동 제외 적용 전) */
export function getDeletionCandidates(
  tweets: Tweet[],
  filters: TweetFilter[],
): Tweet[] {
  const preserved = getPreservedTweets(tweets, filters);
  return tweets.filter((t) => !preserved.has(t.id));
}
