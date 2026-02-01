import type { Tweet, TweetFilter } from '@/types';
import type { FilterCombineMode } from './types';

/**
 * 필터 엔진: 여러 필터를 조합하여 삭제 대상 트윗을 결정.
 * - AND 모드: 모든 삭제 필터 조건을 충족해야 삭제 (기본값)
 * - OR 모드: 하나라도 삭제 조건에 해당하면 삭제
 * - thread 필터: 보존 필터로 특별 처리 (삭제 대상에서 제외)
 */
export function getMatchedTweets(
  tweets: Tweet[],
  filters: TweetFilter[],
  combineMode: FilterCombineMode = 'AND',
): Set<string> {
  const matched = new Set<string>();

  // thread 필터와 삭제 필터 분리
  const enabledFilters = filters.filter((f) => f.enabled);
  const deleteFilters = enabledFilters.filter((f) => f.type !== 'thread');
  const threadFilters = enabledFilters.filter((f) => f.type === 'thread');

  // 삭제 필터가 없으면 삭제 대상 없음 (안전 장치)
  if (deleteFilters.length === 0) {
    return matched;
  }

  // thread 필터로 보존할 트윗 ID 수집
  const preservedByThread = new Set<string>();
  for (const filter of threadFilters) {
    const preserved = filter.apply(tweets);
    for (const t of preserved) {
      preservedByThread.add(t.id);
    }
  }

  if (combineMode === 'AND') {
    // AND: 모든 삭제 필터 조건을 충족해야 삭제
    for (const tweet of tweets) {
      // thread 필터로 보존된 트윗은 제외
      if (preservedByThread.has(tweet.id)) continue;

      const matchesAll = deleteFilters.every((filter) => {
        const result = filter.apply([tweet]);
        return result.length > 0;
      });
      if (matchesAll) {
        matched.add(tweet.id);
      }
    }
  } else {
    // OR: 하나라도 삭제 조건에 해당하면 삭제
    for (const filter of deleteFilters) {
      const result = filter.apply(tweets);
      for (const t of result) {
        // thread 필터로 보존된 트윗은 제외
        if (!preservedByThread.has(t.id)) {
          matched.add(t.id);
        }
      }
    }
  }

  return matched;
}

/** 삭제 대상 트윗 반환 */
export function getTweetsToDelete(
  tweets: Tweet[],
  filters: TweetFilter[],
  excludedIds: Set<string>,
  combineMode: FilterCombineMode = 'AND',
): Tweet[] {
  const matched = getMatchedTweets(tweets, filters, combineMode);

  return tweets.filter((t) => matched.has(t.id) && !excludedIds.has(t.id));
}

/** 삭제 후보 트윗 반환 (수동 제외 적용 전, 최신순 정렬) */
export function getDeletionCandidates(
  tweets: Tweet[],
  filters: TweetFilter[],
  combineMode: FilterCombineMode = 'AND',
): Tweet[] {
  const matched = getMatchedTweets(tweets, filters, combineMode);
  return tweets
    .filter((t) => matched.has(t.id))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
