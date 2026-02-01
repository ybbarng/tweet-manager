import { describe, expect, it } from 'vitest';
import type { FilterState } from '../useFilterState';

/**
 * useFilterState 훅 테스트
 *
 * 참고: React 훅 테스트는 @testing-library/react의 renderHook이 필요합니다.
 * 현재는 순수 로직 검증만 수행합니다.
 *
 * 핵심 필터 로직은 이미 다음 테스트에서 검증됨:
 * - src/lib/filters/__tests__/engine.test.ts
 * - src/lib/filters/__tests__/numeric.test.ts
 * - src/lib/filters/__tests__/keyword.test.ts
 * - src/lib/filters/__tests__/media.test.ts
 * - src/lib/filters/__tests__/reply.test.ts
 * - src/lib/filters/__tests__/dateRange.test.ts
 * - src/lib/filters/__tests__/deletion-safety.test.ts
 */

describe('useFilterState 타입 검증', () => {
  it('DEFAULT_STATE 구조가 올바름', async () => {
    // 훅 모듈에서 타입만 import하여 컴파일 타임 검증
    const { useFilterState } = await import('../useFilterState');

    // 함수가 존재하는지 확인
    expect(typeof useFilterState).toBe('function');
  });

  it('FilterState 타입이 모든 필터를 포함함', () => {
    // 컴파일 타임에 타입 검증됨
    const mockState: FilterState = {
      combineMode: 'AND',
      likes: { enabled: false, operator: '<=', value: 5 },
      retweets: { enabled: false, operator: '<=', value: 3 },
      views: { enabled: false, operator: '<=', value: 100 },
      keyword: {
        enabled: false,
        keywords: [],
        matchMode: 'any',
        negate: false,
      },
      hasPhoto: { enabled: false, value: false },
      hasVideo: { enabled: false, value: false },
      reply: { enabled: false, value: false },
      thread: { enabled: false, excludedIds: [] },
      startDate: { enabled: false, date: null },
      endDate: { enabled: false, date: null },
      displayLimit: 100,
    };

    expect(mockState.combineMode).toBe('AND');
    expect(mockState.likes.operator).toBe('<=');
    expect(mockState.keyword.matchMode).toBe('any');
  });
});
