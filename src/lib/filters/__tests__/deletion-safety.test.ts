import { describe, it, expect } from 'vitest';
import { getPreservedTweets, getTweetsToDelete } from '../engine';
import { createLikesFilter } from '../likes';
import { createRetweetsFilter } from '../retweets';
import { createThreadFilter } from '../thread';
import type { Tweet, TweetFilter } from '@/types';

/**
 * 삭제 안전성 테스트.
 *
 * 이 테스트의 목적:
 * - 보존 조건에 해당하는 트윗이 절대 삭제 대상에 포함되지 않는다
 * - 사용자가 수동으로 제외한 트윗이 삭제되지 않는다
 * - 필터 조합의 경계 조건에서 데이터가 유실되지 않는다
 * - 빈 입력, 중복, 대량 데이터 등 예외 상황에서 안전하게 동작한다
 */

function makeTweet(overrides: Partial<Tweet> = {}): Tweet {
  return {
    id: '1',
    text: 'hello',
    createdAt: new Date('2024-01-01'),
    likes: 0,
    retweets: 0,
    replies: 0,
    isRetweet: false,
    ...overrides,
  };
}

// ============================================================
// 1. 보존 조건에 해당하는 트윗은 절대 삭제되지 않는다
// ============================================================
describe('보존 대상 트윗은 절대 삭제되지 않는다', () => {
  it('좋아요 기준을 충족하는 트윗은 삭제 대상에 포함되지 않는다', () => {
    const tweets = [
      makeTweet({ id: 'keep-1', likes: 10 }),
      makeTweet({ id: 'keep-2', likes: 5 }),  // 경계값 정확히 일치
      makeTweet({ id: 'del-1', likes: 4 }),
      makeTweet({ id: 'del-2', likes: 0 }),
    ];

    const filters = [createLikesFilter(5)];
    const toDelete = getTweetsToDelete(tweets, filters, new Set());
    const deleteIds = new Set(toDelete.map(t => t.id));

    expect(deleteIds.has('keep-1')).toBe(false);
    expect(deleteIds.has('keep-2')).toBe(false);
    expect(deleteIds.has('del-1')).toBe(true);
    expect(deleteIds.has('del-2')).toBe(true);
  });

  it('리트윗 기준을 충족하는 트윗은 삭제 대상에 포함되지 않는다', () => {
    const tweets = [
      makeTweet({ id: 'keep-1', retweets: 100 }),
      makeTweet({ id: 'keep-2', retweets: 3 }),
      makeTweet({ id: 'del-1', retweets: 2 }),
    ];

    const filters = [createRetweetsFilter(3)];
    const toDelete = getTweetsToDelete(tweets, filters, new Set());
    const deleteIds = new Set(toDelete.map(t => t.id));

    expect(deleteIds.has('keep-1')).toBe(false);
    expect(deleteIds.has('keep-2')).toBe(false);
    expect(deleteIds.has('del-1')).toBe(true);
  });

  it('타래 보존 필터에 해당하는 트윗은 삭제되지 않는다', () => {
    const tweets = [
      makeTweet({ id: 'thread-1', conversationId: 'conv-A' }),
      makeTweet({ id: 'thread-2', conversationId: 'conv-A' }),
      makeTweet({ id: 'direct-match', conversationId: 'other' }),
      makeTweet({ id: 'del-1', conversationId: 'conv-B' }),
    ];

    const filters = [createThreadFilter(['conv-A', 'direct-match'])];
    const toDelete = getTweetsToDelete(tweets, filters, new Set());
    const deleteIds = new Set(toDelete.map(t => t.id));

    expect(deleteIds.has('thread-1')).toBe(false);
    expect(deleteIds.has('thread-2')).toBe(false);
    expect(deleteIds.has('direct-match')).toBe(false);
    expect(deleteIds.has('del-1')).toBe(true);
  });

  it('여러 필터의 OR 조합에서 어느 하나라도 보존 조건을 충족하면 삭제되지 않는다', () => {
    const tweets = [
      makeTweet({ id: 'likes-only', likes: 10, retweets: 0 }),
      makeTweet({ id: 'rt-only', likes: 0, retweets: 10 }),
      makeTweet({ id: 'both', likes: 10, retweets: 10 }),
      makeTweet({ id: 'thread-only', likes: 0, retweets: 0, conversationId: 'keep-thread' }),
      makeTweet({ id: 'nothing', likes: 0, retweets: 0 }),
    ];

    const filters = [
      createLikesFilter(5),
      createRetweetsFilter(5),
      createThreadFilter(['keep-thread']),
    ];
    const toDelete = getTweetsToDelete(tweets, filters, new Set());
    const deleteIds = new Set(toDelete.map(t => t.id));

    expect(deleteIds.has('likes-only')).toBe(false);
    expect(deleteIds.has('rt-only')).toBe(false);
    expect(deleteIds.has('both')).toBe(false);
    expect(deleteIds.has('thread-only')).toBe(false);
    expect(deleteIds.has('nothing')).toBe(true);
  });
});

// ============================================================
// 2. 수동 제외된 트윗은 절대 삭제되지 않는다
// ============================================================
describe('수동 제외(excludedIds)된 트윗은 절대 삭제되지 않는다', () => {
  const tweets = [
    makeTweet({ id: '1', likes: 0 }),
    makeTweet({ id: '2', likes: 0 }),
    makeTweet({ id: '3', likes: 0 }),
  ];
  const filters = [createLikesFilter(5)]; // 전부 삭제 대상

  it('excludedIds에 포함된 트윗은 필터에 걸리더라도 삭제되지 않는다', () => {
    const excluded = new Set(['1', '3']);
    const toDelete = getTweetsToDelete(tweets, filters, excluded);
    const deleteIds = new Set(toDelete.map(t => t.id));

    expect(deleteIds.has('1')).toBe(false);
    expect(deleteIds.has('3')).toBe(false);
    expect(deleteIds.has('2')).toBe(true);
  });

  it('전부 수동 제외하면 삭제 대상이 0개이다', () => {
    const excluded = new Set(['1', '2', '3']);
    const toDelete = getTweetsToDelete(tweets, filters, excluded);

    expect(toDelete).toHaveLength(0);
  });

  it('존재하지 않는 ID를 제외해도 에러 없이 동작한다', () => {
    const excluded = new Set(['999', '1000']);
    const toDelete = getTweetsToDelete(tweets, filters, excluded);

    expect(toDelete).toHaveLength(3);
  });
});

// ============================================================
// 3. 필터 없음 = 안전 모드 (전체 보존)
// ============================================================
describe('필터가 없으면 전체 보존 (안전 모드)', () => {
  it('필터 배열이 비어있으면 어떤 트윗도 삭제되지 않는다', () => {
    const tweets = Array.from({ length: 100 }, (_, i) =>
      makeTweet({ id: String(i), likes: 0, retweets: 0 })
    );

    const toDelete = getTweetsToDelete(tweets, [], new Set());

    expect(toDelete).toHaveLength(0);
  });

  it('모든 필터가 비활성이면 어떤 트윗도 삭제되지 않는다', () => {
    const tweets = [
      makeTweet({ id: '1', likes: 0 }),
      makeTweet({ id: '2', likes: 0 }),
    ];

    const f1 = createLikesFilter(5);
    f1.enabled = false;
    const f2 = createRetweetsFilter(5);
    f2.enabled = false;

    const toDelete = getTweetsToDelete(tweets, [f1, f2], new Set());

    expect(toDelete).toHaveLength(0);
  });
});

// ============================================================
// 4. 데이터 무결성 검증
// ============================================================
describe('데이터 무결성', () => {
  it('보존 + 삭제 합집합 = 전체 트윗 (트윗이 사라지지 않는다)', () => {
    const tweets = [
      makeTweet({ id: '1', likes: 10 }),
      makeTweet({ id: '2', likes: 3 }),
      makeTweet({ id: '3', likes: 0, conversationId: 'thread-1' }),
      makeTweet({ id: '4', likes: 0 }),
      makeTweet({ id: '5', likes: 0 }),
    ];

    const filters = [createLikesFilter(5), createThreadFilter(['thread-1'])];
    const excluded = new Set(['5']);

    const preserved = getPreservedTweets(tweets, filters);
    const toDelete = getTweetsToDelete(tweets, filters, excluded);

    const allAccountedIds = new Set([
      ...preserved,
      ...toDelete.map(t => t.id),
      ...excluded,
    ]);

    for (const tweet of tweets) {
      expect(allAccountedIds.has(tweet.id)).toBe(true);
    }
  });

  it('삭제 대상에 보존 대상이 겹치지 않는다 (교집합 = 공집합)', () => {
    const tweets = Array.from({ length: 50 }, (_, i) =>
      makeTweet({
        id: String(i),
        likes: i * 2,
        retweets: i,
        conversationId: i % 10 === 0 ? 'keep-thread' : undefined,
      })
    );

    const filters = [
      createLikesFilter(20),
      createRetweetsFilter(15),
      createThreadFilter(['keep-thread']),
    ];
    const excluded = new Set(['1', '3', '5']);

    const preserved = getPreservedTweets(tweets, filters);
    const toDelete = getTweetsToDelete(tweets, filters, excluded);

    for (const deleted of toDelete) {
      expect(preserved.has(deleted.id)).toBe(false);
      expect(excluded.has(deleted.id)).toBe(false);
    }
  });

  it('삭제 대상에 중복 ID가 없다', () => {
    const tweets = [
      makeTweet({ id: '1', likes: 0 }),
      makeTweet({ id: '2', likes: 0 }),
      makeTweet({ id: '3', likes: 0 }),
    ];

    const filters = [createLikesFilter(5)];
    const toDelete = getTweetsToDelete(tweets, filters, new Set());
    const ids = toDelete.map(t => t.id);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
  });
});

// ============================================================
// 5. 경계 조건
// ============================================================
describe('경계 조건', () => {
  it('트윗이 0개일 때 에러 없이 빈 배열을 반환한다', () => {
    const filters = [createLikesFilter(5)];
    const toDelete = getTweetsToDelete([], filters, new Set());

    expect(toDelete).toHaveLength(0);
  });

  it('필터 임계값이 0이면 모든 트윗이 보존된다 (likes >= 0)', () => {
    const tweets = [
      makeTweet({ id: '1', likes: 0 }),
      makeTweet({ id: '2', likes: 0 }),
    ];

    const filters = [createLikesFilter(0)];
    const toDelete = getTweetsToDelete(tweets, filters, new Set());

    expect(toDelete).toHaveLength(0);
  });

  it('모든 트윗이 보존 조건을 충족하면 삭제 대상이 없다', () => {
    const tweets = Array.from({ length: 20 }, (_, i) =>
      makeTweet({ id: String(i), likes: 100 })
    );

    const filters = [createLikesFilter(5)];
    const toDelete = getTweetsToDelete(tweets, filters, new Set());

    expect(toDelete).toHaveLength(0);
  });

  it('어떤 트윗도 보존 조건을 충족하지 않으면 전부 삭제 대상이다', () => {
    const tweets = Array.from({ length: 20 }, (_, i) =>
      makeTweet({ id: String(i), likes: 0, retweets: 0 })
    );

    const filters = [createLikesFilter(100)];
    const toDelete = getTweetsToDelete(tweets, filters, new Set());

    expect(toDelete).toHaveLength(20);
  });

  it('대량 트윗(10,000개)에서도 보존 대상이 누락되지 않는다', () => {
    const tweets = Array.from({ length: 10000 }, (_, i) =>
      makeTweet({
        id: String(i),
        likes: i % 100 === 0 ? 100 : 0, // 100개마다 인기 트윗
      })
    );

    const filters = [createLikesFilter(50)];
    const preserved = getPreservedTweets(tweets, filters);
    const toDelete = getTweetsToDelete(tweets, filters, new Set());

    // 100의 배수 = 100개 보존
    expect(preserved.size).toBe(100);
    expect(toDelete).toHaveLength(9900);

    // 보존 대상이 삭제 목록에 없는지 확인
    const deleteIds = new Set(toDelete.map(t => t.id));
    for (const id of preserved) {
      expect(deleteIds.has(id)).toBe(false);
    }
  });

  it('buggy 필터가 보존 목록에 빈 배열을 반환해도 다른 필터의 보존은 유지된다', () => {
    const tweets = [
      makeTweet({ id: '1', likes: 100 }),
      makeTweet({ id: '2', likes: 0 }),
    ];

    const buggyFilter: TweetFilter = {
      id: 'buggy',
      type: 'buggy',
      enabled: true,
      apply: () => [], // 항상 빈 배열 반환
    };

    const filters = [createLikesFilter(5), buggyFilter];
    const toDelete = getTweetsToDelete(tweets, filters, new Set());
    const deleteIds = new Set(toDelete.map(t => t.id));

    // 좋아요 필터에 의해 id=1은 보존되어야 한다
    expect(deleteIds.has('1')).toBe(false);
  });
});
