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
import type { FilterState } from '@/lib/store/app-store';
import type { TweetFilter } from '@/types';

/**
 * FilterState에서 TweetFilter 배열을 생성
 */
export function createFiltersFromState(
  filterState: FilterState,
): TweetFilter[] {
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

  if (filterState.keyword.enabled && filterState.keyword.keywords.length > 0) {
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

  if (filterState.thread.enabled && filterState.thread.excludedIds.length > 0) {
    filters.push(createThreadFilter(filterState.thread.excludedIds));
  }

  if (filterState.startDate.enabled && filterState.startDate.date) {
    filters.push(createStartDateFilter(filterState.startDate.date));
  }

  if (filterState.endDate.enabled && filterState.endDate.date) {
    filters.push(createEndDateFilter(filterState.endDate.date));
  }

  return filters;
}

/**
 * 활성화된 필터 조건이 있는지 확인
 */
export function hasActiveConditions(filterState: FilterState): boolean {
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
}
