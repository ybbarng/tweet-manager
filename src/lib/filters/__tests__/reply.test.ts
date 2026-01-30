import { describe, expect, it } from 'vitest';
import type { Tweet } from '@/types';
import { createReplyFilter } from '../reply';

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

describe('답글 필터', () => {
  const tweets: Tweet[] = [
    makeTweet({ id: '1' }), // 일반 트윗
    makeTweet({ id: '2', inReplyToId: '100' }), // 답글
    makeTweet({ id: '3' }), // 일반 트윗
    makeTweet({ id: '4', inReplyToId: '200' }), // 답글
    makeTweet({ id: '5', inReplyToId: '300' }), // 답글
  ];

  describe('isReply=true (답글만)', () => {
    it('답글인 트윗만 필터링', () => {
      const filter = createReplyFilter({ type: 'reply', isReply: true });
      const kept = filter.apply(tweets);
      expect(kept.map((t) => t.id)).toEqual(['2', '4', '5']);
    });
  });

  describe('isReply=false (답글 아닌 것만)', () => {
    it('답글이 아닌 트윗만 필터링', () => {
      const filter = createReplyFilter({ type: 'reply', isReply: false });
      const kept = filter.apply(tweets);
      expect(kept.map((t) => t.id)).toEqual(['1', '3']);
    });
  });
});
