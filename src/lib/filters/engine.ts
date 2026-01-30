import type { Tweet, TweetFilter } from '@/types';
import type { FilterCombineMode } from './types';

/**
 * 필터 엔진: 여러 필터를 조합하여 실행.
 * - OR 모드: 하나라도 보존 조건에 해당하면 보존 (기본값)
 * - AND 모드: 모든 활성 필터 조건을 충족해야 보존
 */
export function getPreservedTweets(
  tweets: Tweet[],
  filters: TweetFilter[],
  combineMode: FilterCombineMode = 'OR',
): Set<string> {
  const preserved = new Set<string>();
  const enabledFilters = filters.filter((f) => f.enabled);

  // 활성 필터가 없으면 전체 보존 (수동 선택 모드에서 별도 처리)
  if (enabledFilters.length === 0) {
    for (const t of tweets) {
      preserved.add(t.id);
    }
    return preserved;
  }

  if (combineMode === 'AND') {
    // AND: 모든 필터를 통과해야 보존
    for (const tweet of tweets) {
      const passesAll = enabledFilters.every((filter) => {
        const kept = filter.apply([tweet]);
        return kept.length > 0;
      });
      if (passesAll) {
        preserved.add(tweet.id);
      }
    }
  } else {
    // OR: 하나라도 통과하면 보존
    for (const filter of enabledFilters) {
      const kept = filter.apply(tweets);
      for (const t of kept) {
        preserved.add(t.id);
      }
    }
  }

  return preserved;
}

/** 삭제 대상 트윗 반환 */
export function getTweetsToDelete(
  tweets: Tweet[],
  filters: TweetFilter[],
  excludedIds: Set<string>,
  combineMode: FilterCombineMode = 'OR',
): Tweet[] {
  const preserved = getPreservedTweets(tweets, filters, combineMode);

  return tweets.filter((t) => !preserved.has(t.id) && !excludedIds.has(t.id));
}

/** 삭제 후보 트윗 반환 (수동 제외 적용 전) */
export function getDeletionCandidates(
  tweets: Tweet[],
  filters: TweetFilter[],
  combineMode: FilterCombineMode = 'OR',
): Tweet[] {
  const preserved = getPreservedTweets(tweets, filters, combineMode);
  return tweets.filter((t) => !preserved.has(t.id));
}
