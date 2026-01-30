import { describe, expect, it } from 'vitest';
import type { Tweet } from '@/types';
import { createKeywordFilter } from '../keyword';

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

describe('키워드 필터', () => {
  const tweets: Tweet[] = [
    makeTweet({ id: '1', text: 'Hello World' }),
    makeTweet({ id: '2', text: 'hello typescript' }),
    makeTweet({ id: '3', text: 'HELLO REACT' }),
    makeTweet({ id: '4', text: 'goodbye world' }),
    makeTweet({ id: '5', text: 'foo bar baz' }),
  ];

  describe('any 모드 (하나라도 포함)', () => {
    it('하나의 키워드가 포함된 트윗 삭제', () => {
      const filter = createKeywordFilter({
        type: 'keyword',
        keywords: ['hello'],
        matchMode: 'any',
      });
      const toDelete = filter.apply(tweets);
      // 대소문자 구분 안 함이 기본 -> id=1,2,3 삭제 대상
      expect(toDelete.map((t) => t.id)).toEqual(['1', '2', '3']);
    });

    it('여러 키워드 중 하나라도 포함', () => {
      const filter = createKeywordFilter({
        type: 'keyword',
        keywords: ['hello', 'goodbye'],
        matchMode: 'any',
      });
      const toDelete = filter.apply(tweets);
      expect(toDelete.map((t) => t.id)).toEqual(['1', '2', '3', '4']);
    });
  });

  describe('all 모드 (모두 포함)', () => {
    it('모든 키워드가 포함된 트윗만 삭제', () => {
      const filter = createKeywordFilter({
        type: 'keyword',
        keywords: ['hello', 'world'],
        matchMode: 'all',
      });
      const toDelete = filter.apply(tweets);
      expect(toDelete.map((t) => t.id)).toEqual(['1']);
    });

    it('하나라도 없으면 삭제 안 됨', () => {
      const filter = createKeywordFilter({
        type: 'keyword',
        keywords: ['hello', 'missing'],
        matchMode: 'all',
      });
      const toDelete = filter.apply(tweets);
      expect(toDelete).toEqual([]);
    });
  });

  describe('대소문자 구분', () => {
    it('caseSensitive=false (기본): 대소문자 무시', () => {
      const filter = createKeywordFilter({
        type: 'keyword',
        keywords: ['HELLO'],
        matchMode: 'any',
        caseSensitive: false,
      });
      const toDelete = filter.apply(tweets);
      expect(toDelete.map((t) => t.id)).toEqual(['1', '2', '3']);
    });

    it('caseSensitive=true: 대소문자 구분', () => {
      const filter = createKeywordFilter({
        type: 'keyword',
        keywords: ['HELLO'],
        matchMode: 'any',
        caseSensitive: true,
      });
      const toDelete = filter.apply(tweets);
      // 정확히 'HELLO'가 있는 것만: id=3
      expect(toDelete.map((t) => t.id)).toEqual(['3']);
    });
  });

  describe('NOT 조건', () => {
    it('negate=true: 키워드 미포함 트윗 삭제', () => {
      const filter = createKeywordFilter({
        type: 'keyword',
        keywords: ['hello'],
        matchMode: 'any',
        negate: true,
      });
      const toDelete = filter.apply(tweets);
      // hello 미포함 트윗 삭제: id=4, id=5
      expect(toDelete.map((t) => t.id)).toEqual(['4', '5']);
    });
  });

  describe('엣지 케이스', () => {
    it('빈 키워드 배열: 삭제 대상 없음', () => {
      const filter = createKeywordFilter({
        type: 'keyword',
        keywords: [],
        matchMode: 'any',
      });
      const toDelete = filter.apply(tweets);
      expect(toDelete.length).toBe(0);
    });

    it('빈 키워드 배열 + negate: 전체 삭제 대상', () => {
      const filter = createKeywordFilter({
        type: 'keyword',
        keywords: [],
        matchMode: 'any',
        negate: true,
      });
      const toDelete = filter.apply(tweets);
      expect(toDelete.length).toBe(tweets.length);
    });
  });
});
