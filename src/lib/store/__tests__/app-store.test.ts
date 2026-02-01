import { beforeEach, describe, expect, it } from 'vitest';
import type { Tweet, TwitterAuth, TwitterUser } from '@/types';
import { useAppStore } from '../app-store';

// 테스트용 트윗 생성
function createTweet(overrides: Partial<Tweet> = {}): Tweet {
  return {
    id: '1',
    text: '테스트 트윗',
    createdAt: new Date('2024-01-15'),
    likes: 10,
    retweets: 5,
    replies: 2,
    views: 100,
    isRetweet: false,
    media: [],
    ...overrides,
  };
}

describe('useAppStore', () => {
  beforeEach(() => {
    // 각 테스트 전에 스토어 초기화
    useAppStore.setState({
      auth: null,
      user: null,
      tweets: [],
      deletionProgress: {
        total: 0,
        completed: 0,
        failed: 0,
        status: 'idle',
      },
      filterState: {
        combineMode: 'AND',
        likes: { enabled: false, operator: '<=', value: 5 },
        retweets: { enabled: false, operator: '<=', value: 3 },
        views: { enabled: false, operator: '<=', value: 100 },
        keyword: {
          enabled: false,
          keywords: [],
          matchMode: 'any',
          negate: false,
        },
        hasPhoto: { enabled: false, value: false },
        hasVideo: { enabled: false, value: false },
        reply: { enabled: false, value: false },
        thread: { enabled: false, excludedIds: [] },
        startDate: { enabled: false, date: null },
        endDate: { enabled: false, date: null },
        displayLimit: 100,
      },
    });
  });

  describe('Auth', () => {
    it('setAuth로 인증 정보를 설정할 수 있다', () => {
      const auth: TwitterAuth = {
        authToken: 'token',
        csrfToken: 'csrf',
        cookie: 'cookie',
      };
      const user: TwitterUser = {
        id: '123',
        screenName: 'testuser',
        name: 'Test User',
      };

      useAppStore.getState().setAuth(auth, user);

      expect(useAppStore.getState().auth).toEqual(auth);
      expect(useAppStore.getState().user).toEqual(user);
    });

    it('logout으로 상태를 초기화할 수 있다', () => {
      const auth: TwitterAuth = {
        authToken: 'token',
        csrfToken: 'csrf',
        cookie: 'cookie',
      };
      const user: TwitterUser = {
        id: '123',
        screenName: 'testuser',
        name: 'Test User',
      };

      useAppStore.getState().setAuth(auth, user);
      useAppStore.getState().setTweets([createTweet()]);
      useAppStore.getState().logout();

      expect(useAppStore.getState().auth).toBeNull();
      expect(useAppStore.getState().user).toBeNull();
      expect(useAppStore.getState().tweets).toEqual([]);
    });
  });

  describe('Tweets', () => {
    it('setTweets로 트윗을 설정할 수 있다', () => {
      const tweets = [createTweet({ id: '1' }), createTweet({ id: '2' })];

      useAppStore.getState().setTweets(tweets);

      expect(useAppStore.getState().tweets).toHaveLength(2);
    });

    it('appendTweets로 트윗을 추가할 수 있다', () => {
      useAppStore.getState().setTweets([createTweet({ id: '1' })]);
      useAppStore.getState().appendTweets([createTweet({ id: '2' })]);

      expect(useAppStore.getState().tweets).toHaveLength(2);
    });

    it('removeTweets로 트윗을 삭제할 수 있다', () => {
      useAppStore
        .getState()
        .setTweets([
          createTweet({ id: '1' }),
          createTweet({ id: '2' }),
          createTweet({ id: '3' }),
        ]);
      useAppStore.getState().removeTweets(['1', '3']);

      expect(useAppStore.getState().tweets).toHaveLength(1);
      expect(useAppStore.getState().tweets[0].id).toBe('2');
    });
  });

  describe('Filters', () => {
    it('setLikesEnabled로 좋아요 필터를 활성화할 수 있다', () => {
      useAppStore.getState().setLikesEnabled(true);

      expect(useAppStore.getState().filterState.likes.enabled).toBe(true);
    });

    it('setLikesOperator로 좋아요 연산자를 변경할 수 있다', () => {
      useAppStore.getState().setLikesOperator('>=');

      expect(useAppStore.getState().filterState.likes.operator).toBe('>=');
    });

    it('setLikesValue로 좋아요 값을 변경할 수 있다', () => {
      useAppStore.getState().setLikesValue(10);

      expect(useAppStore.getState().filterState.likes.value).toBe(10);
    });

    it('setCombineMode로 조합 모드를 변경할 수 있다', () => {
      useAppStore.getState().setCombineMode('OR');

      expect(useAppStore.getState().filterState.combineMode).toBe('OR');
    });

    it('setKeywords로 키워드를 설정할 수 있다', () => {
      useAppStore.getState().setKeywords(['테스트', '키워드']);

      expect(useAppStore.getState().filterState.keyword.keywords).toEqual([
        '테스트',
        '키워드',
      ]);
    });
  });

  describe('Derived State', () => {
    it('hasActiveConditions는 활성화된 필터가 있을 때 true를 반환한다', () => {
      expect(useAppStore.getState().hasActiveConditions()).toBe(false);

      useAppStore.getState().setLikesEnabled(true);

      expect(useAppStore.getState().hasActiveConditions()).toBe(true);
    });

    it('getFilters는 활성화된 필터들을 반환한다', () => {
      expect(useAppStore.getState().getFilters()).toHaveLength(0);

      useAppStore.getState().setLikesEnabled(true);

      expect(useAppStore.getState().getFilters()).toHaveLength(1);
    });

    it('getDeletionCandidates는 필터링된 트윗을 반환한다', () => {
      useAppStore
        .getState()
        .setTweets([
          createTweet({ id: '1', likes: 3 }),
          createTweet({ id: '2', likes: 10 }),
        ]);

      // 필터 없음 - 결과 없음
      expect(useAppStore.getState().getDeletionCandidates()).toHaveLength(0);

      // likes <= 5 필터 활성화
      useAppStore.getState().setLikesEnabled(true);
      useAppStore.getState().setLikesValue(5);

      const candidates = useAppStore.getState().getDeletionCandidates();
      expect(candidates).toHaveLength(1);
      expect(candidates[0].id).toBe('1');
    });
  });

  describe('Deletion Progress', () => {
    it('setDeletionProgress로 진행 상황을 업데이트할 수 있다', () => {
      useAppStore.getState().setDeletionProgress({
        total: 10,
        completed: 5,
        status: 'running',
      });

      expect(useAppStore.getState().deletionProgress.total).toBe(10);
      expect(useAppStore.getState().deletionProgress.completed).toBe(5);
      expect(useAppStore.getState().deletionProgress.status).toBe('running');
    });

    it('resetDeletionProgress로 진행 상황을 초기화할 수 있다', () => {
      useAppStore.getState().setDeletionProgress({
        total: 10,
        completed: 5,
        status: 'running',
      });
      useAppStore.getState().resetDeletionProgress();

      expect(useAppStore.getState().deletionProgress.status).toBe('idle');
      expect(useAppStore.getState().deletionProgress.total).toBe(0);
    });
  });
});
