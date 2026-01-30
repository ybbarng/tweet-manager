import { describe, expect, it } from 'vitest';
import type { Tweet } from '@/types';
import { createEndDateFilter, createStartDateFilter } from '../dateRange';

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

describe('시작일 필터', () => {
  const tweets: Tweet[] = [
    makeTweet({ id: '1', createdAt: new Date('2024-01-01') }),
    makeTweet({ id: '2', createdAt: new Date('2024-01-15') }),
    makeTweet({ id: '3', createdAt: new Date('2024-01-31') }),
    makeTweet({ id: '4', createdAt: new Date('2024-02-15') }),
    makeTweet({ id: '5', createdAt: new Date('2024-03-01') }),
  ];

  it('시작일 이후 트윗을 삭제 대상으로 반환', () => {
    const filter = createStartDateFilter('2024-01-15');
    const toDelete = filter.apply(tweets);
    const ids = toDelete.map((t) => t.id);

    // 2024-01-15 이전 트윗은 삭제 대상 아님
    expect(ids).not.toContain('1');
    // 2024-01-15 이후 트윗은 삭제 대상
    expect(ids).toContain('2');
    expect(ids).toContain('3');
    expect(ids).toContain('4');
    expect(ids).toContain('5');
  });

  it('필터 메타데이터 확인', () => {
    const filter = createStartDateFilter('2024-01-01');

    expect(filter.id).toBe('startDate');
    expect(filter.type).toBe('startDate');
    expect(filter.enabled).toBe(true);
  });

  it('빈 배열 입력 시 빈 배열 반환', () => {
    const filter = createStartDateFilter('2024-01-01');
    const toDelete = filter.apply([]);

    expect(toDelete).toEqual([]);
  });

  it('경계값: 시작일과 동일한 날짜의 트윗', () => {
    const tweetsOnBoundary: Tweet[] = [
      makeTweet({ id: '1', createdAt: new Date('2024-01-15T00:00:00') }),
      makeTweet({ id: '2', createdAt: new Date('2024-01-15T12:00:00') }),
    ];

    const filter = createStartDateFilter('2024-01-15');
    const toDelete = filter.apply(tweetsOnBoundary);
    const ids = toDelete.map((t) => t.id);

    // 시작일에 해당하는 트윗은 삭제 대상
    expect(ids).toContain('1');
    expect(ids).toContain('2');
  });
});

describe('종료일 필터', () => {
  const tweets: Tweet[] = [
    makeTweet({ id: '1', createdAt: new Date('2024-01-01') }),
    makeTweet({ id: '2', createdAt: new Date('2024-01-15') }),
    makeTweet({ id: '3', createdAt: new Date('2024-01-31') }),
    makeTweet({ id: '4', createdAt: new Date('2024-02-15') }),
    makeTweet({ id: '5', createdAt: new Date('2024-03-01') }),
  ];

  it('종료일 이전 트윗을 삭제 대상으로 반환', () => {
    const filter = createEndDateFilter('2024-01-31');
    const toDelete = filter.apply(tweets);
    const ids = toDelete.map((t) => t.id);

    // 2024-01-31 이전 트윗은 삭제 대상
    expect(ids).toContain('1');
    expect(ids).toContain('2');
    expect(ids).toContain('3');
    // 2024-01-31 이후 트윗은 삭제 대상 아님
    expect(ids).not.toContain('4');
    expect(ids).not.toContain('5');
  });

  it('종료일은 해당 일자 끝까지 포함 (23:59:59)', () => {
    const tweetsWithTime: Tweet[] = [
      makeTweet({ id: '1', createdAt: new Date('2024-01-31T23:59:59') }),
      makeTweet({ id: '2', createdAt: new Date('2024-02-01T00:00:01') }),
    ];

    const filter = createEndDateFilter('2024-01-31');
    const toDelete = filter.apply(tweetsWithTime);
    const ids = toDelete.map((t) => t.id);

    // 2024-01-31 23:59:59는 삭제 대상
    expect(ids).toContain('1');
    // 2024-02-01 00:00:01은 삭제 대상 아님
    expect(ids).not.toContain('2');
  });

  it('필터 메타데이터 확인', () => {
    const filter = createEndDateFilter('2024-12-31');

    expect(filter.id).toBe('endDate');
    expect(filter.type).toBe('endDate');
    expect(filter.enabled).toBe(true);
  });

  it('빈 배열 입력 시 빈 배열 반환', () => {
    const filter = createEndDateFilter('2024-12-31');
    const toDelete = filter.apply([]);

    expect(toDelete).toEqual([]);
  });
});
