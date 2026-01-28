import { describe, expect, it } from 'vitest';
import type { Tweet } from '@/types';
import { initialState, reducer } from '../tweet-store';

const createMockTweet = (id: string): Tweet => ({
  id,
  text: `Tweet ${id}`,
  createdAt: new Date('2024-01-01'),
  likes: 0,
  retweets: 0,
  replies: 0,
  isRetweet: false,
});

describe('tweet-store reducer', () => {
  describe('SET_TWEETS', () => {
    it('트윗 목록을 설정한다', () => {
      const tweets = [createMockTweet('1'), createMockTweet('2')];
      const state = reducer(initialState, {
        type: 'SET_TWEETS',
        payload: tweets,
      });
      expect(state.tweets).toEqual(tweets);
    });

    it('기존 트윗을 덮어쓴다', () => {
      const oldTweets = [createMockTweet('1')];
      const newTweets = [createMockTweet('2'), createMockTweet('3')];
      const stateWithOld = reducer(initialState, {
        type: 'SET_TWEETS',
        payload: oldTweets,
      });
      const state = reducer(stateWithOld, {
        type: 'SET_TWEETS',
        payload: newTweets,
      });
      expect(state.tweets).toEqual(newTweets);
      expect(state.tweets).not.toContainEqual(oldTweets[0]);
    });
  });

  describe('APPEND_TWEETS', () => {
    it('기존 트윗에 새 트윗을 추가한다', () => {
      const existingTweets = [createMockTweet('1'), createMockTweet('2')];
      const newTweets = [createMockTweet('3'), createMockTweet('4')];
      const stateWithExisting = reducer(initialState, {
        type: 'SET_TWEETS',
        payload: existingTweets,
      });
      const state = reducer(stateWithExisting, {
        type: 'APPEND_TWEETS',
        payload: newTweets,
      });

      expect(state.tweets).toHaveLength(4);
      expect(state.tweets[0].id).toBe('1');
      expect(state.tweets[1].id).toBe('2');
      expect(state.tweets[2].id).toBe('3');
      expect(state.tweets[3].id).toBe('4');
    });

    it('빈 배열에 트윗을 추가한다', () => {
      const newTweets = [createMockTweet('1')];
      const state = reducer(initialState, {
        type: 'APPEND_TWEETS',
        payload: newTweets,
      });
      expect(state.tweets).toEqual(newTweets);
    });

    it('빈 배열을 추가해도 기존 트윗이 유지된다', () => {
      const existingTweets = [createMockTweet('1')];
      const stateWithExisting = reducer(initialState, {
        type: 'SET_TWEETS',
        payload: existingTweets,
      });
      const state = reducer(stateWithExisting, {
        type: 'APPEND_TWEETS',
        payload: [],
      });
      expect(state.tweets).toEqual(existingTweets);
    });
  });

  describe('REMOVE_DELETED_TWEETS', () => {
    it('지정된 ID의 트윗을 제거한다', () => {
      const tweets = [
        createMockTweet('1'),
        createMockTweet('2'),
        createMockTweet('3'),
      ];
      const stateWithTweets = reducer(initialState, {
        type: 'SET_TWEETS',
        payload: tweets,
      });
      const state = reducer(stateWithTweets, {
        type: 'REMOVE_DELETED_TWEETS',
        payload: ['2'],
      });

      expect(state.tweets).toHaveLength(2);
      expect(state.tweets.map((t) => t.id)).toEqual(['1', '3']);
    });
  });

  describe('LOGOUT', () => {
    it('상태를 초기화한다', () => {
      const tweets = [createMockTweet('1')];
      const stateWithTweets = reducer(initialState, {
        type: 'SET_TWEETS',
        payload: tweets,
      });
      const state = reducer(stateWithTweets, { type: 'LOGOUT' });
      expect(state).toEqual(initialState);
    });
  });
});
