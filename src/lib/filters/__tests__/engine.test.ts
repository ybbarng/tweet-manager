import { describe, expect, it } from 'vitest';
import type { Tweet } from '@/types';
import { createEndDateFilter, createStartDateFilter } from '../dateRange';
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

describe('필터 엔진', () => {
  const tweets: Tweet[] = [
    makeTweet({ id: '1', likes: 10, retweets: 5 }),
    makeTweet({ id: '2', likes: 2, retweets: 0 }),
    makeTweet({ id: '3', likes: 0, retweets: 10 }),
    makeTweet({ id: '4', likes: 0, retweets: 0, conversationId: 'thread-1' }),
    makeTweet({ id: '5', likes: 0, retweets: 0 }),
  ];

  it('필터가 없으면 삭제 대상 없음 (안전 장치)', () => {
    const matched = getMatchedTweets(tweets, []);
    expect(matched.size).toBe(0);
  });

  it('좋아요 필터: likes < 5인 트윗 삭제', () => {
    const filters = [likesLessThan(5)];
    const matched = getMatchedTweets(tweets, filters);
    expect(matched.has('1')).toBe(false); // likes=10 >= 5
    expect(matched.has('2')).toBe(true); // likes=2 < 5
    expect(matched.has('3')).toBe(true); // likes=0 < 5
  });

  it('리트윗 필터: retweets < 5인 트윗 삭제', () => {
    const filters = [retweetsLessThan(5)];
    const matched = getMatchedTweets(tweets, filters);
    expect(matched.has('1')).toBe(false); // retweets=5 >= 5
    expect(matched.has('2')).toBe(true); // retweets=0 < 5
    expect(matched.has('3')).toBe(false); // retweets=10 >= 5
  });

  it('타래 필터: 지정된 타래는 삭제에서 제외 (보존)', () => {
    const filters = [
      likesLessThan(5), // id=2,3,4,5 삭제 대상
      createThreadFilter(['thread-1']), // id=4는 보존
    ];
    const matched = getMatchedTweets(tweets, filters);
    expect(matched.has('4')).toBe(false); // thread 필터로 보존
    expect(matched.has('5')).toBe(true); // 삭제 대상
  });

  it('AND 조합: 모든 삭제 조건을 충족해야 삭제', () => {
    // likes < 5 AND retweets < 5
    const filters = [likesLessThan(5), retweetsLessThan(5)];
    const matched = getMatchedTweets(tweets, filters, 'AND');
    // id=1: likes=10 >= 5 -> 조건 미충족 -> 삭제 안 됨
    // id=2: likes=2 < 5, retweets=0 < 5 -> 둘 다 충족 -> 삭제
    // id=3: likes=0 < 5, retweets=10 >= 5 -> retweets 미충족 -> 삭제 안 됨
    expect(matched.has('1')).toBe(false);
    expect(matched.has('2')).toBe(true);
    expect(matched.has('3')).toBe(false);
    expect(matched.has('4')).toBe(true);
    expect(matched.has('5')).toBe(true);
  });

  it('OR 조합: 하나라도 삭제 조건에 해당하면 삭제', () => {
    // likes < 5 OR retweets < 5
    const filters = [likesLessThan(5), retweetsLessThan(5)];
    const matched = getMatchedTweets(tweets, filters, 'OR');
    // id=1: likes=10 >= 5, retweets=5 >= 5 -> 둘 다 미충족 -> 삭제 안 됨
    // id=2: likes=2 < 5 -> 삭제
    // id=3: retweets=10 >= 5, likes=0 < 5 -> likes 조건 충족 -> 삭제
    expect(matched.has('1')).toBe(false);
    expect(matched.has('2')).toBe(true);
    expect(matched.has('3')).toBe(true);
    expect(matched.has('4')).toBe(true);
    expect(matched.has('5')).toBe(true);
  });

  it('getTweetsToDelete: 삭제 조건에 맞는 트윗 반환', () => {
    const filters = [likesLessThan(5)];
    const toDelete = getTweetsToDelete(tweets, filters, new Set());
    const ids = toDelete.map((t) => t.id);
    expect(ids).toContain('2');
    expect(ids).toContain('3');
    expect(ids).toContain('4');
    expect(ids).toContain('5');
    expect(ids).not.toContain('1');
  });

  it('getTweetsToDelete: excludedIds로 수동 제외', () => {
    const filters = [likesLessThan(5)];
    const excluded = new Set(['2']); // id=2를 수동으로 보존
    const toDelete = getTweetsToDelete(tweets, filters, excluded);
    const ids = toDelete.map((t) => t.id);
    expect(ids).not.toContain('1'); // 필터 조건 미충족
    expect(ids).not.toContain('2'); // 수동 제외
    expect(ids).toContain('3');
  });

  it('비활성 필터는 무시됨', () => {
    const filter = likesLessThan(5);
    filter.enabled = false;
    const matched = getMatchedTweets(tweets, [filter]);
    // 활성 필터가 없으므로 삭제 대상 없음
    expect(matched.size).toBe(0);
  });

  it('날짜 범위 필터: 해당 기간 트윗 삭제', () => {
    const tweetsWithDates: Tweet[] = [
      makeTweet({ id: '1', createdAt: new Date('2024-01-01') }),
      makeTweet({ id: '2', createdAt: new Date('2024-06-15') }),
      makeTweet({ id: '3', createdAt: new Date('2024-12-31') }),
    ];
    // startDate: 2024-03-01 이후 삭제 대상
    // endDate: 2024-09-30 이전 삭제 대상
    // AND 조합: 2024-03-01 ~ 2024-09-30 사이 트윗 삭제
    const filters = [
      createStartDateFilter('2024-03-01'),
      createEndDateFilter('2024-09-30'),
    ];
    const matched = getMatchedTweets(tweetsWithDates, filters, 'AND');

    expect(matched.has('1')).toBe(false); // 범위 밖 (이전)
    expect(matched.has('2')).toBe(true); // 범위 안
    expect(matched.has('3')).toBe(false); // 범위 밖 (이후)
  });

  it('날짜 범위 + 좋아요 필터 조합: AND 동작', () => {
    const tweetsWithDates: Tweet[] = [
      makeTweet({ id: '1', createdAt: new Date('2024-06-15'), likes: 10 }), // 범위 안, 좋아요 많음
      makeTweet({ id: '2', createdAt: new Date('2024-06-15'), likes: 0 }), // 범위 안, 좋아요 없음
      makeTweet({ id: '3', createdAt: new Date('2024-01-01'), likes: 0 }), // 범위 밖, 좋아요 없음
    ];
    // 삭제 조건: 날짜 범위 안 AND likes < 5
    const filters = [
      createStartDateFilter('2024-03-01'),
      createEndDateFilter('2024-09-30'),
      likesLessThan(5),
    ];
    const matched = getMatchedTweets(tweetsWithDates, filters, 'AND');

    // id=1: 범위 안이지만 likes >= 5 -> 삭제 안 됨
    expect(matched.has('1')).toBe(false);
    // id=2: 범위 안 AND likes < 5 -> 삭제
    expect(matched.has('2')).toBe(true);
    // id=3: 범위 밖 -> 삭제 안 됨
    expect(matched.has('3')).toBe(false);
  });

  describe('OR 조합 모드', () => {
    it('OR 조합: 하나라도 조건 충족 시 삭제', () => {
      // id=1: likes=10, retweets=5
      // id=2: likes=2, retweets=0
      // id=3: likes=0, retweets=10
      const filters = [likesLessThan(5), retweetsLessThan(5)];
      const matched = getMatchedTweets(tweets, filters, 'OR');

      expect(matched.has('1')).toBe(false); // 둘 다 미충족
      expect(matched.has('2')).toBe(true); // likes < 5
      expect(matched.has('3')).toBe(true); // likes < 5
      expect(matched.has('4')).toBe(true);
      expect(matched.has('5')).toBe(true);
    });

    it('AND 조합 vs OR 조합 비교', () => {
      const filters = [likesLessThan(5), retweetsLessThan(5)];

      const orMatched = getMatchedTweets(tweets, filters, 'OR');
      const andMatched = getMatchedTweets(tweets, filters, 'AND');

      // OR: likes < 5 || retweets < 5
      expect(orMatched.size).toBe(4); // id=2,3,4,5

      // AND: likes < 5 && retweets < 5
      expect(andMatched.size).toBe(3); // id=2,4,5
    });

    it('getTweetsToDelete에 combineMode 전달', () => {
      const filters = [likesLessThan(5), retweetsLessThan(5)];
      const toDelete = getTweetsToDelete(tweets, filters, new Set(), 'OR');
      const ids = toDelete.map((t) => t.id);

      // OR 모드에서 id=2,3,4,5 삭제 대상
      expect(ids).not.toContain('1');
      expect(ids).toContain('2');
      expect(ids).toContain('3');
      expect(ids).toContain('4');
      expect(ids).toContain('5');
    });
  });
});
