import type { Tweet } from '@/types';

/** 비교 연산자 */
export type ComparisonOperator = '>=' | '>' | '<=' | '<' | '=';

/** 필터 조합 모드 */
export type FilterCombineMode = 'OR' | 'AND';

/** 기본 필터 옵션 (모든 필터에서 사용) */
export interface BaseFilterOptions {
  /** NOT 조건 (결과 반전) */
  negate?: boolean;
}

/** 숫자 필터 설정 (likes, retweets, replies, views) */
export interface NumericFilterConfig extends BaseFilterOptions {
  type: 'numeric';
  /** 대상 필드 */
  field: 'likes' | 'retweets' | 'replies' | 'views';
  /** 비교 연산자 */
  operator: ComparisonOperator;
  /** 기준 값 */
  value: number;
}

/** 키워드 필터 설정 */
export interface KeywordFilterConfig extends BaseFilterOptions {
  type: 'keyword';
  /** 검색할 키워드 목록 */
  keywords: string[];
  /** 매칭 모드: any(하나라도), all(모두) */
  matchMode: 'any' | 'all';
  /** 대소문자 구분 */
  caseSensitive?: boolean;
}

/** 미디어 필터 설정 */
export interface MediaFilterConfig extends BaseFilterOptions {
  type: 'media';
  /** 미디어 타입: photo, video, any(미디어 있음), none(미디어 없음) */
  mediaType: 'photo' | 'video' | 'any' | 'none';
}

/** 답글 필터 설정 */
export interface ReplyFilterConfig extends BaseFilterOptions {
  type: 'reply';
  /** true: 답글만 보존, false: 답글 아닌 것만 보존 */
  isReply: boolean;
}

/** 타래 필터 설정 */
export interface ThreadFilterConfig extends BaseFilterOptions {
  type: 'thread';
  /** 보존할 타래의 conversation ID 또는 트윗 ID 목록 */
  preservedIds: string[];
}

/** 날짜 범위 필터 설정 */
export interface DateRangeFilterConfig extends BaseFilterOptions {
  type: 'dateRange';
  /** 시작일 (ISO 문자열, null이면 제한 없음) */
  startDate: string | null;
  /** 종료일 (ISO 문자열, null이면 제한 없음) */
  endDate: string | null;
}

/** 레거시 호환: 좋아요 필터 */
export interface LikesFilterConfig {
  type: 'likes';
  minLikes: number;
}

/** 레거시 호환: 리트윗 필터 */
export interface RetweetsFilterConfig {
  type: 'retweets';
  minRetweets: number;
}

export type FilterConfig =
  | NumericFilterConfig
  | KeywordFilterConfig
  | MediaFilterConfig
  | ReplyFilterConfig
  | ThreadFilterConfig
  | DateRangeFilterConfig
  | LikesFilterConfig
  | RetweetsFilterConfig;

/** 필터 함수 시그니처 */
export type FilterFn = (tweets: Tweet[]) => Tweet[];

/** negate 옵션을 적용하는 헬퍼 */
export function applyNegate<T>(
  items: T[],
  allItems: T[],
  negate?: boolean,
): T[] {
  if (!negate) return items;
  const keptSet = new Set(items);
  return allItems.filter((item) => !keptSet.has(item));
}
