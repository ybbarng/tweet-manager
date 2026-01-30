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
