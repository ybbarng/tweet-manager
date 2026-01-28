import { describe, expect, it } from 'vitest';
import type { Tweet } from '@/types';
import { getPreservedTweets, getTweetsToDelete } from '../engine';
import { createLikesFilter } from '../likes';
import { createRetweetsFilter } from '../retweets';
import { createThreadFilter } from '../thread';

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

  it('필터가 없으면 전체 삭제 후보', () => {
    const preserved = getPreservedTweets(tweets, []);
    expect(preserved.size).toBe(0); // 보존할 트윗 없음 = 전체 삭제 후보
  });

  it('좋아요 필터: minLikes 이상인 트윗만 보존', () => {
    const filters = [createLikesFilter(5)];
    const preserved = getPreservedTweets(tweets, filters);
    expect(preserved.has('1')).toBe(true);
    expect(preserved.has('2')).toBe(false);
  });

  it('리트윗 필터: minRetweets 이상인 트윗만 보존', () => {
    const filters = [createRetweetsFilter(5)];
    const preserved = getPreservedTweets(tweets, filters);
    expect(preserved.has('1')).toBe(true);
    expect(preserved.has('3')).toBe(true);
    expect(preserved.has('5')).toBe(false);
  });

  it('타래 필터: 지정된 conversationId에 속하는 트윗 보존', () => {
    const filters = [createThreadFilter(['thread-1'])];
    const preserved = getPreservedTweets(tweets, filters);
    expect(preserved.has('4')).toBe(true);
    expect(preserved.has('5')).toBe(false);
  });

  it('OR 조합: 하나라도 보존 조건에 맞으면 보존', () => {
    const filters = [createLikesFilter(5), createRetweetsFilter(5)];
    const preserved = getPreservedTweets(tweets, filters);
    // id=1: likes=10 >= 5 -> 보존
    // id=3: retweets=10 >= 5 -> 보존
    expect(preserved.has('1')).toBe(true);
    expect(preserved.has('3')).toBe(true);
    // id=2, id=4, id=5: 조건 미충족
    expect(preserved.has('2')).toBe(false);
    expect(preserved.has('5')).toBe(false);
  });

  it('getTweetsToDelete: 보존되지 않은 트윗 반환', () => {
    const filters = [createLikesFilter(5)];
    const toDelete = getTweetsToDelete(tweets, filters, new Set());
    const ids = toDelete.map((t) => t.id);
    expect(ids).toContain('2');
    expect(ids).toContain('3');
    expect(ids).toContain('4');
    expect(ids).toContain('5');
    expect(ids).not.toContain('1');
  });

  it('getTweetsToDelete: excludedIds로 수동 제외', () => {
    const filters = [createLikesFilter(5)];
    const excluded = new Set(['2']); // id=2를 수동으로 보존
    const toDelete = getTweetsToDelete(tweets, filters, excluded);
    const ids = toDelete.map((t) => t.id);
    expect(ids).not.toContain('1'); // 필터로 보존
    expect(ids).not.toContain('2'); // 수동 제외
    expect(ids).toContain('3');
  });

  it('비활성 필터는 무시됨', () => {
    const filter = createLikesFilter(5);
    filter.enabled = false;
    const preserved = getPreservedTweets(tweets, [filter]);
    // 활성 필터가 없으므로 전체 삭제 후보
    expect(preserved.size).toBe(0);
  });
});
