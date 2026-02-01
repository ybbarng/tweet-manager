'use client';

import { create } from 'zustand';
import {
  createEndDateFilter,
  createStartDateFilter,
} from '@/lib/filters/dateRange';
import { getDeletionCandidates } from '@/lib/filters/engine';
import { createKeywordFilter } from '@/lib/filters/keyword';
import {
  createHasPhotoFilter,
  createHasVideoFilter,
} from '@/lib/filters/media';
import { createNumericFilter } from '@/lib/filters/numeric';
import { createReplyFilter } from '@/lib/filters/reply';
import { createThreadFilter } from '@/lib/filters/thread';
import type {
  ComparisonOperator,
  FilterCombineMode,
} from '@/lib/filters/types';
import type {
  DeletionProgress,
  Tweet,
  TweetFilter,
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

const DEFAULT_FILTER_STATE: FilterState = {
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

  // === Computed/Derived ===
  getFilters: () => TweetFilter[];
  hasActiveConditions: () => boolean;
  getDeletionCandidates: () => Tweet[];
}

export const useAppStore = create<AppStore>((set, get) => ({
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

  // === Computed/Derived ===
  getFilters: () => {
    const { filterState } = get();
    const filters: TweetFilter[] = [];

    if (filterState.likes.enabled) {
      filters.push(
        createNumericFilter({
          type: 'numeric',
          field: 'likes',
          operator: filterState.likes.operator,
          value: filterState.likes.value,
        }),
      );
    }

    if (filterState.retweets.enabled) {
      filters.push(
        createNumericFilter({
          type: 'numeric',
          field: 'retweets',
          operator: filterState.retweets.operator,
          value: filterState.retweets.value,
        }),
      );
    }

    if (filterState.views.enabled) {
      filters.push(
        createNumericFilter({
          type: 'numeric',
          field: 'views',
          operator: filterState.views.operator,
          value: filterState.views.value,
        }),
      );
    }

    if (
      filterState.keyword.enabled &&
      filterState.keyword.keywords.length > 0
    ) {
      filters.push(
        createKeywordFilter({
          type: 'keyword',
          keywords: filterState.keyword.keywords,
          matchMode: filterState.keyword.matchMode,
          negate: filterState.keyword.negate,
        }),
      );
    }

    if (filterState.hasPhoto.enabled) {
      filters.push(
        createHasPhotoFilter({
          type: 'hasPhoto',
          hasPhoto: filterState.hasPhoto.value,
        }),
      );
    }

    if (filterState.hasVideo.enabled) {
      filters.push(
        createHasVideoFilter({
          type: 'hasVideo',
          hasVideo: filterState.hasVideo.value,
        }),
      );
    }

    if (filterState.reply.enabled) {
      filters.push(
        createReplyFilter({
          type: 'reply',
          isReply: filterState.reply.value,
        }),
      );
    }

    if (
      filterState.thread.enabled &&
      filterState.thread.excludedIds.length > 0
    ) {
      filters.push(createThreadFilter(filterState.thread.excludedIds));
    }

    if (filterState.startDate.enabled && filterState.startDate.date) {
      filters.push(createStartDateFilter(filterState.startDate.date));
    }

    if (filterState.endDate.enabled && filterState.endDate.date) {
      filters.push(createEndDateFilter(filterState.endDate.date));
    }

    return filters;
  },

  hasActiveConditions: () => {
    const { filterState } = get();
    return (
      filterState.likes.enabled ||
      filterState.retweets.enabled ||
      filterState.views.enabled ||
      filterState.keyword.enabled ||
      filterState.hasPhoto.enabled ||
      filterState.hasVideo.enabled ||
      filterState.reply.enabled ||
      filterState.startDate.enabled ||
      filterState.endDate.enabled
    );
  },

  getDeletionCandidates: () => {
    const { tweets, filterState } = get();
    const filters = get().getFilters();
    return getDeletionCandidates(tweets, filters, filterState.combineMode);
  },
}));
