'use client';

import { create } from 'zustand';
import type {
  ComparisonOperator,
  FilterCombineMode,
} from '@/lib/filters/types';
import type {
  DeletionProgress,
  Tweet,
  TwitterAuth,
  TwitterUser,
} from '@/types';

// Filter 상태 타입
export interface NumericFilterState {
  enabled: boolean;
  operator: ComparisonOperator;
  value: number;
}

export interface KeywordFilterState {
  enabled: boolean;
  keywords: string[];
  matchMode: 'any' | 'all';
  negate: boolean;
}

export interface BooleanFilterState {
  enabled: boolean;
  value: boolean;
}

export interface DateFilterState {
  enabled: boolean;
  date: string | null;
}

export interface ThreadFilterState {
  enabled: boolean;
  excludedIds: string[];
}

export interface FilterState {
  combineMode: FilterCombineMode;
  likes: NumericFilterState;
  retweets: NumericFilterState;
  views: NumericFilterState;
  keyword: KeywordFilterState;
  hasPhoto: BooleanFilterState;
  hasVideo: BooleanFilterState;
  reply: BooleanFilterState;
  thread: ThreadFilterState;
  startDate: DateFilterState;
  endDate: DateFilterState;
  displayLimit: number | null;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  combineMode: 'AND',
  likes: { enabled: false, operator: '<=', value: 5 },
  retweets: { enabled: false, operator: '<=', value: 3 },
  views: { enabled: false, operator: '<=', value: 100 },
  keyword: { enabled: false, keywords: [], matchMode: 'any', negate: false },
  hasPhoto: { enabled: false, value: false },
  hasVideo: { enabled: false, value: false },
  reply: { enabled: false, value: false },
  thread: { enabled: false, excludedIds: [] },
  startDate: { enabled: false, date: null },
  endDate: { enabled: false, date: null },
  displayLimit: 100,
};

const DEFAULT_DELETION_PROGRESS: DeletionProgress = {
  total: 0,
  completed: 0,
  failed: 0,
  status: 'idle',
};

// 스토어 타입
interface AppStore {
  // === Auth ===
  auth: TwitterAuth | null;
  user: TwitterUser | null;
  setAuth: (auth: TwitterAuth, user: TwitterUser) => void;
  logout: () => void;

  // === Tweets ===
  tweets: Tweet[];
  setTweets: (tweets: Tweet[]) => void;
  appendTweets: (tweets: Tweet[]) => void;
  removeTweets: (ids: string[]) => void;

  // === Deletion Progress ===
  deletionProgress: DeletionProgress;
  setDeletionProgress: (progress: Partial<DeletionProgress>) => void;
  resetDeletionProgress: () => void;

  // === Filters ===
  filterState: FilterState;
  setCombineMode: (mode: FilterCombineMode) => void;
  // Likes
  setLikesEnabled: (enabled: boolean) => void;
  setLikesOperator: (op: ComparisonOperator) => void;
  setLikesValue: (value: number) => void;
  // Retweets
  setRetweetsEnabled: (enabled: boolean) => void;
  setRetweetsOperator: (op: ComparisonOperator) => void;
  setRetweetsValue: (value: number) => void;
  // Views
  setViewsEnabled: (enabled: boolean) => void;
  setViewsOperator: (op: ComparisonOperator) => void;
  setViewsValue: (value: number) => void;
  // Keyword
  setKeywordEnabled: (enabled: boolean) => void;
  setKeywords: (keywords: string[]) => void;
  setKeywordMatchMode: (mode: 'any' | 'all') => void;
  setKeywordNegate: (negate: boolean) => void;
  // HasPhoto
  setHasPhotoEnabled: (enabled: boolean) => void;
  setHasPhotoValue: (value: boolean) => void;
  // HasVideo
  setHasVideoEnabled: (enabled: boolean) => void;
  setHasVideoValue: (value: boolean) => void;
  // Reply
  setReplyEnabled: (enabled: boolean) => void;
  setReplyValue: (value: boolean) => void;
  // Thread
  setThreadEnabled: (enabled: boolean) => void;
  setThreadExcludedIds: (ids: string[]) => void;
  // StartDate
  setStartDateEnabled: (enabled: boolean) => void;
  setStartDate: (date: string | null) => void;
  // EndDate
  setEndDateEnabled: (enabled: boolean) => void;
  setEndDate: (date: string | null) => void;
  // Display Limit
  setDisplayLimit: (limit: number | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // === Auth ===
  auth: null,
  user: null,
  setAuth: (auth, user) => set({ auth, user }),
  logout: () =>
    set({
      auth: null,
      user: null,
      tweets: [],
      deletionProgress: DEFAULT_DELETION_PROGRESS,
      filterState: DEFAULT_FILTER_STATE,
    }),

  // === Tweets ===
  tweets: [],
  setTweets: (tweets) => set({ tweets }),
  appendTweets: (newTweets) =>
    set((state) => ({ tweets: [...state.tweets, ...newTweets] })),
  removeTweets: (ids) =>
    set((state) => ({
      tweets: state.tweets.filter((t) => !ids.includes(t.id)),
    })),

  // === Deletion Progress ===
  deletionProgress: DEFAULT_DELETION_PROGRESS,
  setDeletionProgress: (progress) =>
    set((state) => ({
      deletionProgress: { ...state.deletionProgress, ...progress },
    })),
  resetDeletionProgress: () =>
    set({ deletionProgress: DEFAULT_DELETION_PROGRESS }),

  // === Filters ===
  filterState: DEFAULT_FILTER_STATE,

  setCombineMode: (mode) =>
    set((state) => ({
      filterState: { ...state.filterState, combineMode: mode },
    })),

  // Likes
  setLikesEnabled: (enabled) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        likes: { ...state.filterState.likes, enabled },
      },
    })),
  setLikesOperator: (operator) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        likes: { ...state.filterState.likes, operator },
      },
    })),
  setLikesValue: (value) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        likes: { ...state.filterState.likes, value },
      },
    })),

  // Retweets
  setRetweetsEnabled: (enabled) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        retweets: { ...state.filterState.retweets, enabled },
      },
    })),
  setRetweetsOperator: (operator) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        retweets: { ...state.filterState.retweets, operator },
      },
    })),
  setRetweetsValue: (value) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        retweets: { ...state.filterState.retweets, value },
      },
    })),

  // Views
  setViewsEnabled: (enabled) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        views: { ...state.filterState.views, enabled },
      },
    })),
  setViewsOperator: (operator) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        views: { ...state.filterState.views, operator },
      },
    })),
  setViewsValue: (value) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        views: { ...state.filterState.views, value },
      },
    })),

  // Keyword
  setKeywordEnabled: (enabled) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        keyword: { ...state.filterState.keyword, enabled },
      },
    })),
  setKeywords: (keywords) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        keyword: { ...state.filterState.keyword, keywords },
      },
    })),
  setKeywordMatchMode: (matchMode) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        keyword: { ...state.filterState.keyword, matchMode },
      },
    })),
  setKeywordNegate: (negate) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        keyword: { ...state.filterState.keyword, negate },
      },
    })),

  // HasPhoto
  setHasPhotoEnabled: (enabled) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        hasPhoto: { ...state.filterState.hasPhoto, enabled },
      },
    })),
  setHasPhotoValue: (value) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        hasPhoto: { ...state.filterState.hasPhoto, value },
      },
    })),

  // HasVideo
  setHasVideoEnabled: (enabled) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        hasVideo: { ...state.filterState.hasVideo, enabled },
      },
    })),
  setHasVideoValue: (value) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        hasVideo: { ...state.filterState.hasVideo, value },
      },
    })),

  // Reply
  setReplyEnabled: (enabled) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        reply: { ...state.filterState.reply, enabled },
      },
    })),
  setReplyValue: (value) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        reply: { ...state.filterState.reply, value },
      },
    })),

  // Thread
  setThreadEnabled: (enabled) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        thread: { ...state.filterState.thread, enabled },
      },
    })),
  setThreadExcludedIds: (excludedIds) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        thread: { ...state.filterState.thread, excludedIds },
      },
    })),

  // StartDate
  setStartDateEnabled: (enabled) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        startDate: { ...state.filterState.startDate, enabled },
      },
    })),
  setStartDate: (date) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        startDate: { ...state.filterState.startDate, date },
      },
    })),

  // EndDate
  setEndDateEnabled: (enabled) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        endDate: { ...state.filterState.endDate, enabled },
      },
    })),
  setEndDate: (date) =>
    set((state) => ({
      filterState: {
        ...state.filterState,
        endDate: { ...state.filterState.endDate, date },
      },
    })),

  // Display Limit
  setDisplayLimit: (displayLimit) =>
    set((state) => ({
      filterState: { ...state.filterState, displayLimit },
    })),
}));
