import { describe, expect, it } from 'vitest';
import type { Tweet, TweetFilter } from '@/types';
import { getMatchedTweets, getTweetsToDelete } from '../engine';
import { createNumericFilter } from '../numeric';
import { createThreadFilter } from '../thread';

/** 테스트용 좋아요 필터 생성 헬퍼: likes < value인 트윗 삭제 */
function likesLessThan(value: number) {
  return createNumericFilter({
    type: 'numeric',
    field: 'likes',
    operator: '<',
    value,
  });
}

/** 테스트용 리트윗 필터 생성 헬퍼: retweets < value인 트윗 삭제 */
function retweetsLessThan(value: number) {
  return createNumericFilter({
    type: 'numeric',
    field: 'retweets',
    operator: '<',
    value,
  });
}

/**
 * 삭제 안전성 테스트.
 *
 * 이 테스트의 목적:
 * - 삭제 조건에 해당하지 않는 트윗은 절대 삭제되지 않는다
 * - 사용자가 수동으로 제외한 트윗이 삭제되지 않는다
 * - thread 필터로 보존된 트윗이 삭제되지 않는다
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
// 1. 삭제 조건에 해당하지 않는 트윗은 절대 삭제되지 않는다
// ============================================================
describe('삭제 조건 미충족 트윗은 절대 삭제되지 않는다', () => {
  it('좋아요 기준 미충족 트윗은 삭제 대상에 포함되지 않는다', () => {
    const tweets = [
      makeTweet({ id: 'keep-1', likes: 10 }),
      makeTweet({ id: 'keep-2', likes: 5 }), // 경계값 정확히 일치
      makeTweet({ id: 'del-1', likes: 4 }),
      makeTweet({ id: 'del-2', likes: 0 }),
    ];

    const filters = [likesLessThan(5)]; // likes < 5 삭제
    const toDelete = getTweetsToDelete(tweets, filters, new Set());
    const deleteIds = new Set(toDelete.map((t) => t.id));

    expect(deleteIds.has('keep-1')).toBe(false); // likes >= 5
    expect(deleteIds.has('keep-2')).toBe(false); // likes = 5 (경계값)
    expect(deleteIds.has('del-1')).toBe(true); // likes < 5
    expect(deleteIds.has('del-2')).toBe(true); // likes < 5
  });

  it('리트윗 기준 미충족 트윗은 삭제 대상에 포함되지 않는다', () => {
    const tweets = [
      makeTweet({ id: 'keep-1', retweets: 100 }),
      makeTweet({ id: 'keep-2', retweets: 3 }),
      makeTweet({ id: 'del-1', retweets: 2 }),
    ];

    const filters = [retweetsLessThan(3)]; // retweets < 3 삭제
    const toDelete = getTweetsToDelete(tweets, filters, new Set());
    const deleteIds = new Set(toDelete.map((t) => t.id));

    expect(deleteIds.has('keep-1')).toBe(false);
    expect(deleteIds.has('keep-2')).toBe(false);
    expect(deleteIds.has('del-1')).toBe(true);
  });

  it('타래 필터로 보존된 트윗은 삭제되지 않는다', () => {
    const tweets = [
      makeTweet({ id: 'thread-1', conversationId: 'conv-A', likes: 0 }),
      makeTweet({ id: 'thread-2', conversationId: 'conv-A', likes: 0 }),
      makeTweet({ id: 'direct-match', conversationId: 'other', likes: 0 }),
      makeTweet({ id: 'del-1', conversationId: 'conv-B', likes: 0 }),
    ];

    const filters = [
      likesLessThan(5), // 전부 삭제 대상
      createThreadFilter(['conv-A', 'direct-match']), // 이 트윗들은 보존
    ];
    const toDelete = getTweetsToDelete(tweets, filters, new Set());
    const deleteIds = new Set(toDelete.map((t) => t.id));

    expect(deleteIds.has('thread-1')).toBe(false); // thread 필터로 보존
    expect(deleteIds.has('thread-2')).toBe(false); // thread 필터로 보존
    expect(deleteIds.has('direct-match')).toBe(false); // thread 필터로 보존
    expect(deleteIds.has('del-1')).toBe(true); // 삭제 대상
  });

  it('AND 조합에서 모든 조건 충족하지 않으면 삭제 안 됨', () => {
    const tweets = [
      makeTweet({ id: 'likes-low', likes: 0, retweets: 10 }), // likes만 충족
      makeTweet({ id: 'rt-low', likes: 10, retweets: 0 }), // retweets만 충족
      makeTweet({ id: 'both-low', likes: 0, retweets: 0 }), // 둘 다 충족
      makeTweet({ id: 'both-high', likes: 10, retweets: 10 }), // 둘 다 미충족
    ];

    const filters = [likesLessThan(5), retweetsLessThan(5)];
    const toDelete = getTweetsToDelete(tweets, filters, new Set(), 'AND');
    const deleteIds = new Set(toDelete.map((t) => t.id));

    expect(deleteIds.has('likes-low')).toBe(false); // retweets 미충족
    expect(deleteIds.has('rt-low')).toBe(false); // likes 미충족
    expect(deleteIds.has('both-low')).toBe(true); // 둘 다 충족
    expect(deleteIds.has('both-high')).toBe(false); // 둘 다 미충족
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
  const filters = [likesLessThan(5)]; // 전부 삭제 대상

  it('excludedIds에 포함된 트윗은 필터에 걸리더라도 삭제되지 않는다', () => {
    const excluded = new Set(['1', '3']);
    const toDelete = getTweetsToDelete(tweets, filters, excluded);
    const deleteIds = new Set(toDelete.map((t) => t.id));

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
// 3. 필터 없음 = 삭제 대상 없음 (안전 기본값)
// ============================================================
describe('필터가 없으면 삭제 대상 없음 (안전 기본값)', () => {
  it('필터 배열이 비어있으면 삭제 대상이 없다', () => {
    const tweets = Array.from({ length: 100 }, (_, i) =>
      makeTweet({ id: String(i), likes: 0, retweets: 0 }),
    );

    const toDelete = getTweetsToDelete(tweets, [], new Set());

    expect(toDelete).toHaveLength(0);
  });

  it('모든 필터가 비활성이면 삭제 대상이 없다', () => {
    const tweets = [
      makeTweet({ id: '1', likes: 0 }),
      makeTweet({ id: '2', likes: 0 }),
    ];

    const f1 = likesLessThan(5);
    f1.enabled = false;
    const f2 = retweetsLessThan(5);
    f2.enabled = false;

    const toDelete = getTweetsToDelete(tweets, [f1, f2], new Set());

    expect(toDelete).toHaveLength(0);
  });
});

// ============================================================
// 4. 데이터 무결성 검증
// ============================================================
describe('데이터 무결성', () => {
  it('삭제 + 비삭제 합집합 = 전체 트윗 (트윗이 사라지지 않는다)', () => {
    const tweets = [
      makeTweet({ id: '1', likes: 10 }),
      makeTweet({ id: '2', likes: 3 }),
      makeTweet({ id: '3', likes: 0, conversationId: 'thread-1' }),
      makeTweet({ id: '4', likes: 0 }),
      makeTweet({ id: '5', likes: 0 }),
    ];

    const filters = [
      likesLessThan(5),
      createThreadFilter(['thread-1']), // id=3 보존
    ];
    const excluded = new Set(['5']); // id=5 수동 제외

    const toDelete = getTweetsToDelete(tweets, filters, excluded);

    // 삭제 대상: matched - excluded
    // 비삭제: !matched || excluded
    const deleteIds = new Set(toDelete.map((t) => t.id));
    const nonDeleteIds = new Set(
      tweets.filter((t) => !deleteIds.has(t.id)).map((t) => t.id),
    );

    // 합집합 = 전체
    const allIds = new Set([...deleteIds, ...nonDeleteIds]);
    expect(allIds.size).toBe(tweets.length);
    for (const tweet of tweets) {
      expect(allIds.has(tweet.id)).toBe(true);
    }
  });

  it('삭제 대상에 중복 ID가 없다', () => {
    const tweets = [
      makeTweet({ id: '1', likes: 0 }),
      makeTweet({ id: '2', likes: 0 }),
      makeTweet({ id: '3', likes: 0 }),
    ];

    const filters = [likesLessThan(5)];
    const toDelete = getTweetsToDelete(tweets, filters, new Set());
    const ids = toDelete.map((t) => t.id);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
  });
});

// ============================================================
// 5. 경계 조건
// ============================================================
describe('경계 조건', () => {
  it('트윗이 0개일 때 에러 없이 빈 배열을 반환한다', () => {
    const filters = [likesLessThan(5)];
    const toDelete = getTweetsToDelete([], filters, new Set());

    expect(toDelete).toHaveLength(0);
  });

  it('필터 임계값이 0이면 삭제 대상이 없다 (likes < 0은 불가능)', () => {
    const tweets = [
      makeTweet({ id: '1', likes: 0 }),
      makeTweet({ id: '2', likes: 0 }),
    ];

    const filters = [likesLessThan(0)];
    const toDelete = getTweetsToDelete(tweets, filters, new Set());

    expect(toDelete).toHaveLength(0);
  });

  it('모든 트윗이 삭제 조건을 충족하면 전부 삭제 대상이다', () => {
    const tweets = Array.from({ length: 20 }, (_, i) =>
      makeTweet({ id: String(i), likes: 0 }),
    );

    const filters = [likesLessThan(5)];
    const toDelete = getTweetsToDelete(tweets, filters, new Set());

    expect(toDelete).toHaveLength(20);
  });

  it('어떤 트윗도 삭제 조건을 충족하지 않으면 삭제 대상이 없다', () => {
    const tweets = Array.from({ length: 20 }, (_, i) =>
      makeTweet({ id: String(i), likes: 100 }),
    );

    const filters = [likesLessThan(5)];
    const toDelete = getTweetsToDelete(tweets, filters, new Set());

    expect(toDelete).toHaveLength(0);
  });

  it('대량 트윗(10,000개)에서도 정확하게 동작한다', () => {
    const tweets = Array.from({ length: 10000 }, (_, i) =>
      makeTweet({
        id: String(i),
        likes: i % 100 === 0 ? 100 : 0, // 100개마다 인기 트윗
      }),
    );

    const filters = [likesLessThan(50)];
    const matched = getMatchedTweets(tweets, filters);
    const toDelete = getTweetsToDelete(tweets, filters, new Set());

    // likes >= 50인 트윗 (100의 배수) = 100개 -> 삭제 안 됨
    // likes < 50인 트윗 = 9900개 -> 삭제 대상
    expect(matched.size).toBe(9900);
    expect(toDelete).toHaveLength(9900);

    // 삭제 안 되는 트윗 확인
    const deleteIds = new Set(toDelete.map((t) => t.id));
    for (let i = 0; i < 10000; i += 100) {
      expect(deleteIds.has(String(i))).toBe(false);
    }
  });

  it('buggy 필터가 빈 배열을 반환해도 다른 필터의 삭제 대상은 유지된다', () => {
    const tweets = [
      makeTweet({ id: '1', likes: 0 }),
      makeTweet({ id: '2', likes: 100 }),
    ];

    const buggyFilter: TweetFilter = {
      id: 'buggy',
      type: 'buggy',
      enabled: true,
      apply: () => [], // 항상 빈 배열 반환
    };

    // AND 조합에서 buggy 필터가 빈 배열 반환하면 교집합이 공집합
    const filters = [likesLessThan(5), buggyFilter];
    const toDelete = getTweetsToDelete(tweets, filters, new Set(), 'AND');

    // buggy 필터 때문에 아무것도 삭제 안 됨 (AND 조합)
    expect(toDelete).toHaveLength(0);
  });

  it('OR 조합에서 buggy 필터가 빈 배열 반환해도 다른 필터 동작', () => {
    const tweets = [
      makeTweet({ id: '1', likes: 0 }),
      makeTweet({ id: '2', likes: 100 }),
    ];

    const buggyFilter: TweetFilter = {
      id: 'buggy',
      type: 'buggy',
      enabled: true,
      apply: () => [], // 항상 빈 배열 반환
    };

    const filters = [likesLessThan(5), buggyFilter];
    const toDelete = getTweetsToDelete(tweets, filters, new Set(), 'OR');
    const deleteIds = new Set(toDelete.map((t) => t.id));

    // OR 조합에서는 likesLessThan(5) 필터가 동작
    expect(deleteIds.has('1')).toBe(true);
    expect(deleteIds.has('2')).toBe(false);
  });
});
