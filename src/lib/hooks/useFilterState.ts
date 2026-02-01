'use client';

import { useMemo, useState } from 'react';
import {
  createEndDateFilter,
  createStartDateFilter,
} from '@/lib/filters/dateRange';
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
import type { TweetFilter } from '@/types';

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

export interface FilterActions {
  setCombineMode: (mode: FilterCombineMode) => void;
  // likes
  setLikesEnabled: (enabled: boolean) => void;
  setLikesOperator: (op: ComparisonOperator) => void;
  setLikesValue: (value: number) => void;
  // retweets
  setRetweetsEnabled: (enabled: boolean) => void;
  setRetweetsOperator: (op: ComparisonOperator) => void;
  setRetweetsValue: (value: number) => void;
  // views
  setViewsEnabled: (enabled: boolean) => void;
  setViewsOperator: (op: ComparisonOperator) => void;
  setViewsValue: (value: number) => void;
  // keyword
  setKeywordEnabled: (enabled: boolean) => void;
  setKeywords: (keywords: string[]) => void;
  setKeywordMatchMode: (mode: 'any' | 'all') => void;
  setKeywordNegate: (negate: boolean) => void;
  // hasPhoto
  setHasPhotoEnabled: (enabled: boolean) => void;
  setHasPhotoValue: (value: boolean) => void;
  // hasVideo
  setHasVideoEnabled: (enabled: boolean) => void;
  setHasVideoValue: (value: boolean) => void;
  // reply
  setReplyEnabled: (enabled: boolean) => void;
  setReplyValue: (isReply: boolean) => void;
  // thread
  setThreadEnabled: (enabled: boolean) => void;
  setThreadExcludedIds: (ids: string[]) => void;
  // startDate
  setStartDateEnabled: (enabled: boolean) => void;
  setStartDate: (date: string | null) => void;
  // endDate
  setEndDateEnabled: (enabled: boolean) => void;
  setEndDate: (date: string | null) => void;
  // displayLimit
  setDisplayLimit: (limit: number | null) => void;
}

export interface UseFilterStateReturn {
  state: FilterState;
  actions: FilterActions;
  filters: TweetFilter[];
  hasActiveConditions: boolean;
}

const DEFAULT_STATE: FilterState = {
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

export function useFilterState(): UseFilterStateReturn {
  // 조합 모드
  const [combineMode, setCombineMode] = useState<FilterCombineMode>(
    DEFAULT_STATE.combineMode,
  );

  // likes
  const [likesEnabled, setLikesEnabled] = useState(DEFAULT_STATE.likes.enabled);
  const [likesOperator, setLikesOperator] = useState<ComparisonOperator>(
    DEFAULT_STATE.likes.operator,
  );
  const [likesValue, setLikesValue] = useState(DEFAULT_STATE.likes.value);

  // retweets
  const [retweetsEnabled, setRetweetsEnabled] = useState(
    DEFAULT_STATE.retweets.enabled,
  );
  const [retweetsOperator, setRetweetsOperator] = useState<ComparisonOperator>(
    DEFAULT_STATE.retweets.operator,
  );
  const [retweetsValue, setRetweetsValue] = useState(
    DEFAULT_STATE.retweets.value,
  );

  // views
  const [viewsEnabled, setViewsEnabled] = useState(DEFAULT_STATE.views.enabled);
  const [viewsOperator, setViewsOperator] = useState<ComparisonOperator>(
    DEFAULT_STATE.views.operator,
  );
  const [viewsValue, setViewsValue] = useState(DEFAULT_STATE.views.value);

  // keyword
  const [keywordEnabled, setKeywordEnabled] = useState(
    DEFAULT_STATE.keyword.enabled,
  );
  const [keywords, setKeywords] = useState<string[]>(
    DEFAULT_STATE.keyword.keywords,
  );
  const [keywordMatchMode, setKeywordMatchMode] = useState<'any' | 'all'>(
    DEFAULT_STATE.keyword.matchMode,
  );
  const [keywordNegate, setKeywordNegate] = useState(
    DEFAULT_STATE.keyword.negate,
  );

  // hasPhoto
  const [hasPhotoEnabled, setHasPhotoEnabled] = useState(
    DEFAULT_STATE.hasPhoto.enabled,
  );
  const [hasPhotoValue, setHasPhotoValue] = useState(
    DEFAULT_STATE.hasPhoto.value,
  );

  // hasVideo
  const [hasVideoEnabled, setHasVideoEnabled] = useState(
    DEFAULT_STATE.hasVideo.enabled,
  );
  const [hasVideoValue, setHasVideoValue] = useState(
    DEFAULT_STATE.hasVideo.value,
  );

  // reply
  const [replyEnabled, setReplyEnabled] = useState(DEFAULT_STATE.reply.enabled);
  const [replyValue, setReplyValue] = useState(DEFAULT_STATE.reply.value);

  // thread
  const [threadEnabled, setThreadEnabled] = useState(
    DEFAULT_STATE.thread.enabled,
  );
  const [threadExcludedIds, setThreadExcludedIds] = useState<string[]>(
    DEFAULT_STATE.thread.excludedIds,
  );

  // startDate
  const [startDateEnabled, setStartDateEnabled] = useState(
    DEFAULT_STATE.startDate.enabled,
  );
  const [startDate, setStartDate] = useState<string | null>(
    DEFAULT_STATE.startDate.date,
  );

  // endDate
  const [endDateEnabled, setEndDateEnabled] = useState(
    DEFAULT_STATE.endDate.enabled,
  );
  const [endDate, setEndDate] = useState<string | null>(
    DEFAULT_STATE.endDate.date,
  );

  // displayLimit
  const [displayLimit, setDisplayLimit] = useState<number | null>(
    DEFAULT_STATE.displayLimit,
  );

  // 필터 객체 배열 생성
  const filters = useMemo(() => {
    const f: TweetFilter[] = [];

    if (likesEnabled) {
      f.push(
        createNumericFilter({
          type: 'numeric',
          field: 'likes',
          operator: likesOperator,
          value: likesValue,
        }),
      );
    }

    if (retweetsEnabled) {
      f.push(
        createNumericFilter({
          type: 'numeric',
          field: 'retweets',
          operator: retweetsOperator,
          value: retweetsValue,
        }),
      );
    }

    if (viewsEnabled) {
      f.push(
        createNumericFilter({
          type: 'numeric',
          field: 'views',
          operator: viewsOperator,
          value: viewsValue,
        }),
      );
    }

    if (keywordEnabled && keywords.length > 0) {
      f.push(
        createKeywordFilter({
          type: 'keyword',
          keywords,
          matchMode: keywordMatchMode,
          negate: keywordNegate,
        }),
      );
    }

    if (hasPhotoEnabled) {
      f.push(
        createHasPhotoFilter({ type: 'hasPhoto', hasPhoto: hasPhotoValue }),
      );
    }

    if (hasVideoEnabled) {
      f.push(
        createHasVideoFilter({ type: 'hasVideo', hasVideo: hasVideoValue }),
      );
    }

    if (replyEnabled) {
      f.push(createReplyFilter({ type: 'reply', isReply: replyValue }));
    }

    if (threadEnabled && threadExcludedIds.length > 0) {
      f.push(createThreadFilter(threadExcludedIds));
    }

    if (startDateEnabled && startDate) {
      f.push(createStartDateFilter(startDate));
    }

    if (endDateEnabled && endDate) {
      f.push(createEndDateFilter(endDate));
    }

    return f;
  }, [
    likesEnabled,
    likesOperator,
    likesValue,
    retweetsEnabled,
    retweetsOperator,
    retweetsValue,
    viewsEnabled,
    viewsOperator,
    viewsValue,
    keywordEnabled,
    keywords,
    keywordMatchMode,
    keywordNegate,
    hasPhotoEnabled,
    hasPhotoValue,
    hasVideoEnabled,
    hasVideoValue,
    replyEnabled,
    replyValue,
    threadEnabled,
    threadExcludedIds,
    startDateEnabled,
    startDate,
    endDateEnabled,
    endDate,
  ]);

  const hasActiveConditions =
    likesEnabled ||
    retweetsEnabled ||
    viewsEnabled ||
    keywordEnabled ||
    hasPhotoEnabled ||
    hasVideoEnabled ||
    replyEnabled ||
    startDateEnabled ||
    endDateEnabled;

  const state: FilterState = {
    combineMode,
    likes: {
      enabled: likesEnabled,
      operator: likesOperator,
      value: likesValue,
    },
    retweets: {
      enabled: retweetsEnabled,
      operator: retweetsOperator,
      value: retweetsValue,
    },
    views: {
      enabled: viewsEnabled,
      operator: viewsOperator,
      value: viewsValue,
    },
    keyword: {
      enabled: keywordEnabled,
      keywords,
      matchMode: keywordMatchMode,
      negate: keywordNegate,
    },
    hasPhoto: { enabled: hasPhotoEnabled, value: hasPhotoValue },
    hasVideo: { enabled: hasVideoEnabled, value: hasVideoValue },
    reply: { enabled: replyEnabled, value: replyValue },
    thread: { enabled: threadEnabled, excludedIds: threadExcludedIds },
    startDate: { enabled: startDateEnabled, date: startDate },
    endDate: { enabled: endDateEnabled, date: endDate },
    displayLimit,
  };

  const actions: FilterActions = {
    setCombineMode,
    setLikesEnabled,
    setLikesOperator,
    setLikesValue,
    setRetweetsEnabled,
    setRetweetsOperator,
    setRetweetsValue,
    setViewsEnabled,
    setViewsOperator,
    setViewsValue,
    setKeywordEnabled,
    setKeywords,
    setKeywordMatchMode,
    setKeywordNegate,
    setHasPhotoEnabled,
    setHasPhotoValue,
    setHasVideoEnabled,
    setHasVideoValue,
    setReplyEnabled,
    setReplyValue,
    setThreadEnabled,
    setThreadExcludedIds,
    setStartDateEnabled,
    setStartDate,
    setEndDateEnabled,
    setEndDate,
    setDisplayLimit,
  };

  return { state, actions, filters, hasActiveConditions };
}
