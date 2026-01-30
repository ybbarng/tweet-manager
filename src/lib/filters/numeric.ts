import type { Tweet, TweetFilter } from '@/types';
import type { ComparisonOperator, NumericFilterConfig } from './types';

/** 비교 연산자 적용 */
function compareValue(
  actual: number | undefined,
  operator: ComparisonOperator,
  target: number,
): boolean {
  // views 등 undefined일 수 있는 필드 처리
  if (actual === undefined) return false;

  switch (operator) {
    case '>=':
      return actual >= target;
    case '>':
      return actual > target;
    case '<=':
      return actual <= target;
    case '<':
      return actual < target;
    case '=':
      return actual === target;
    default:
      return false;
  }
}

/** 통합 숫자 필터 생성 */
export function createNumericFilter(config: NumericFilterConfig): TweetFilter {
  const { field, operator, value } = config;

  return {
    id: `numeric-${field}`,
    type: 'numeric',
    enabled: true,
    apply: (tweets: Tweet[]) => {
      return tweets.filter((t) => {
        const fieldValue = t[field as keyof Tweet] as number | undefined;
        return compareValue(fieldValue, operator, value);
      });
    },
  };
}

/** 좋아요 필터 (비교 연산자 지원) */
export function createLikesFilterV2(
  operator: ComparisonOperator,
  value: number,
): TweetFilter {
  return createNumericFilter({
    type: 'numeric',
    field: 'likes',
    operator,
    value,
  });
}

/** 리트윗 필터 (비교 연산자 지원) */
export function createRetweetsFilterV2(
  operator: ComparisonOperator,
  value: number,
): TweetFilter {
  return createNumericFilter({
    type: 'numeric',
    field: 'retweets',
    operator,
    value,
  });
}

/** 답글 수 필터 (비교 연산자 지원) */
export function createRepliesFilter(
  operator: ComparisonOperator,
  value: number,
): TweetFilter {
  return createNumericFilter({
    type: 'numeric',
    field: 'replies',
    operator,
    value,
  });
}

/** 조회수 필터 (비교 연산자 지원) */
export function createViewsFilter(
  operator: ComparisonOperator,
  value: number,
): TweetFilter {
  return createNumericFilter({
    type: 'numeric',
    field: 'views',
    operator,
    value,
  });
}
