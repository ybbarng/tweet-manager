import type { Tweet } from '@/types';

/** 필터 설정값 */
export interface LikesFilterConfig {
  type: 'likes';
  minLikes: number;
}

export interface RetweetsFilterConfig {
  type: 'retweets';
  minRetweets: number;
}

export interface ThreadFilterConfig {
  type: 'thread';
  /** 보존할 타래의 conversation ID 또는 트윗 ID 목록 */
  preservedIds: string[];
}

export interface DateRangeFilterConfig {
  type: 'dateRange';
  /** 시작일 (ISO 문자열, null이면 제한 없음) */
  startDate: string | null;
  /** 종료일 (ISO 문자열, null이면 제한 없음) */
  endDate: string | null;
}

export type FilterConfig =
  | LikesFilterConfig
  | RetweetsFilterConfig
  | ThreadFilterConfig
  | DateRangeFilterConfig;

/** 필터 함수 시그니처 */
export type FilterFn = (tweets: Tweet[]) => Tweet[];
