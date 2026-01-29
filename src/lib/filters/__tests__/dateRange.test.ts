import { describe, expect, it } from 'vitest';
import type { Tweet } from '@/types';
import { createDateRangeFilter } from '../dateRange';

function makeTweet(overrides: Partial<Tweet> = {}): Tweet {
  return {
    id: '1',
    text: 'hello',
    createdAt: new Date('2024-01-15'),
    likes: 0,
    retweets: 0,
    replies: 0,
    isRetweet: false,
    ...overrides,
  };
}

describe('날짜 범위 필터', () => {
  const tweets: Tweet[] = [
    makeTweet({ id: '1', createdAt: new Date('2024-01-01') }),
    makeTweet({ id: '2', createdAt: new Date('2024-01-15') }),
    makeTweet({ id: '3', createdAt: new Date('2024-01-31') }),
    makeTweet({ id: '4', createdAt: new Date('2024-02-15') }),
    makeTweet({ id: '5', createdAt: new Date('2024-03-01') }),
  ];

  it('시작일만 지정: 시작일 이전 트윗 보존 (이후 삭제)', () => {
    const filter = createDateRangeFilter('2024-01-15', null);
    const preserved = filter.apply(tweets);
    const ids = preserved.map((t) => t.id);

    // 2024-01-15 이전 트윗만 보존
    expect(ids).toContain('1');
    // 2024-01-15 이후 트윗은 삭제 대상
    expect(ids).not.toContain('2');
    expect(ids).not.toContain('3');
    expect(ids).not.toContain('4');
    expect(ids).not.toContain('5');
  });

  it('종료일만 지정: 종료일 이후 트윗 보존 (이전 삭제)', () => {
    const filter = createDateRangeFilter(null, '2024-01-31');
    const preserved = filter.apply(tweets);
    const ids = preserved.map((t) => t.id);

    // 2024-01-31 이후 트윗만 보존
    expect(ids).toContain('4');
    expect(ids).toContain('5');
    // 2024-01-31 이전 트윗은 삭제 대상
    expect(ids).not.toContain('1');
    expect(ids).not.toContain('2');
    expect(ids).not.toContain('3');
  });

  it('시작일과 종료일 모두 지정: 범위 밖 트윗 보존 (범위 안 삭제)', () => {
    const filter = createDateRangeFilter('2024-01-10', '2024-02-01');
    const preserved = filter.apply(tweets);
    const ids = preserved.map((t) => t.id);

    // 범위 밖 트윗 보존
    expect(ids).toContain('1'); // 2024-01-01 < 시작일
    expect(ids).toContain('4'); // 2024-02-15 > 종료일
    expect(ids).toContain('5'); // 2024-03-01 > 종료일

    // 범위 안 트윗은 삭제 대상
    expect(ids).not.toContain('2'); // 2024-01-15 범위 안
    expect(ids).not.toContain('3'); // 2024-01-31 범위 안
  });

  it('종료일은 해당 일자 끝까지 포함 (23:59:59)', () => {
    const tweetsWithTime: Tweet[] = [
      makeTweet({ id: '1', createdAt: new Date('2024-01-31T23:59:59') }),
      makeTweet({ id: '2', createdAt: new Date('2024-02-01T00:00:01') }),
    ];

    const filter = createDateRangeFilter('2024-01-01', '2024-01-31');
    const preserved = filter.apply(tweetsWithTime);
    const ids = preserved.map((t) => t.id);

    // 2024-01-31 23:59:59는 범위 안 -> 삭제 대상
    expect(ids).not.toContain('1');
    // 2024-02-01 00:00:01은 범위 밖 -> 보존
    expect(ids).toContain('2');
  });

  it('둘 다 null이면 전체 보존', () => {
    const filter = createDateRangeFilter(null, null);
    const preserved = filter.apply(tweets);

    // 범위가 없으면 모두 범위 밖 -> 전체 보존
    expect(preserved.length).toBe(tweets.length);
  });

  it('필터 메타데이터 확인', () => {
    const filter = createDateRangeFilter('2024-01-01', '2024-12-31');

    expect(filter.id).toBe('dateRange');
    expect(filter.type).toBe('dateRange');
    expect(filter.enabled).toBe(true);
  });

  it('빈 배열 입력 시 빈 배열 반환', () => {
    const filter = createDateRangeFilter('2024-01-01', '2024-12-31');
    const preserved = filter.apply([]);

    expect(preserved).toEqual([]);
  });

  it('경계값: 시작일과 동일한 날짜의 트윗', () => {
    const tweetsOnBoundary: Tweet[] = [
      makeTweet({ id: '1', createdAt: new Date('2024-01-15T00:00:00') }),
      makeTweet({ id: '2', createdAt: new Date('2024-01-15T12:00:00') }),
    ];

    const filter = createDateRangeFilter('2024-01-15', '2024-01-31');
    const preserved = filter.apply(tweetsOnBoundary);
    const ids = preserved.map((t) => t.id);

    // 시작일에 해당하는 트윗은 범위 안 -> 삭제 대상
    expect(ids).not.toContain('1');
    expect(ids).not.toContain('2');
  });
});
