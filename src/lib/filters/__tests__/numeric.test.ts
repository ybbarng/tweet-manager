import { describe, expect, it } from 'vitest';
import type { Tweet } from '@/types';
import { createNumericFilter } from '../numeric';

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

describe('숫자 필터', () => {
  const tweets: Tweet[] = [
    makeTweet({ id: '1', likes: 10, retweets: 5, replies: 3, views: 100 }),
    makeTweet({ id: '2', likes: 5, retweets: 0, replies: 0, views: 50 }),
    makeTweet({ id: '3', likes: 0, retweets: 10, replies: 5, views: 200 }),
    makeTweet({ id: '4', likes: 3, retweets: 3, replies: 3 }), // views 없음
    makeTweet({ id: '5', likes: 0, retweets: 0, replies: 0, views: 0 }),
  ];

  describe('비교 연산자', () => {
    it('>= 연산자', () => {
      const filter = createNumericFilter({
        type: 'numeric',
        field: 'likes',
        operator: '>=',
        value: 5,
      });
      const kept = filter.apply(tweets);
      expect(kept.map((t) => t.id)).toEqual(['1', '2']);
    });

    it('> 연산자', () => {
      const filter = createNumericFilter({
        type: 'numeric',
        field: 'likes',
        operator: '>',
        value: 5,
      });
      const kept = filter.apply(tweets);
      expect(kept.map((t) => t.id)).toEqual(['1']);
    });

    it('<= 연산자', () => {
      const filter = createNumericFilter({
        type: 'numeric',
        field: 'likes',
        operator: '<=',
        value: 3,
      });
      const kept = filter.apply(tweets);
      expect(kept.map((t) => t.id)).toEqual(['3', '4', '5']);
    });

    it('< 연산자', () => {
      const filter = createNumericFilter({
        type: 'numeric',
        field: 'likes',
        operator: '<',
        value: 3,
      });
      const kept = filter.apply(tweets);
      expect(kept.map((t) => t.id)).toEqual(['3', '5']);
    });

    it('= 연산자', () => {
      const filter = createNumericFilter({
        type: 'numeric',
        field: 'likes',
        operator: '=',
        value: 5,
      });
      const kept = filter.apply(tweets);
      expect(kept.map((t) => t.id)).toEqual(['2']);
    });
  });

  describe('views 필드', () => {
    it('views가 있는 트윗만 필터링', () => {
      const filter = createNumericFilter({
        type: 'numeric',
        field: 'views',
        operator: '>=',
        value: 100,
      });
      const kept = filter.apply(tweets);
      // id=1 (100), id=3 (200)
      expect(kept.map((t) => t.id)).toEqual(['1', '3']);
    });

    it('views가 undefined인 트윗은 제외', () => {
      const filter = createNumericFilter({
        type: 'numeric',
        field: 'views',
        operator: '>=',
        value: 0,
      });
      const kept = filter.apply(tweets);
      // id=4는 views 없음
      expect(kept.map((t) => t.id)).toEqual(['1', '2', '3', '5']);
    });
  });

  describe('다양한 필드 테스트', () => {
    it('likes 필드', () => {
      const filter = createNumericFilter({
        type: 'numeric',
        field: 'likes',
        operator: '>=',
        value: 5,
      });
      const kept = filter.apply(tweets);
      expect(kept.map((t) => t.id)).toEqual(['1', '2']);
    });

    it('retweets 필드', () => {
      const filter = createNumericFilter({
        type: 'numeric',
        field: 'retweets',
        operator: '>=',
        value: 5,
      });
      const kept = filter.apply(tweets);
      expect(kept.map((t) => t.id)).toEqual(['1', '3']);
    });

    it('replies 필드', () => {
      const filter = createNumericFilter({
        type: 'numeric',
        field: 'replies',
        operator: '>=',
        value: 3,
      });
      const kept = filter.apply(tweets);
      expect(kept.map((t) => t.id)).toEqual(['1', '3', '4']);
    });
  });
});
