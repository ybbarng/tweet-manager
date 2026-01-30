import type { Tweet } from '@/types';

/** 비교 연산자 */
export type ComparisonOperator = '>=' | '>' | '<=' | '<' | '=';

/** 필터 조합 모드 */
export type FilterCombineMode = 'OR' | 'AND';

/** 기본 필터 옵션 (NOT 조건 지원하는 필터용) */
export interface BaseFilterOptions {
  /** NOT 조건 (결과 반전) */
  negate?: boolean;
}

/** 숫자 필터 설정 (likes, retweets, replies, views) */
export interface NumericFilterConfig {
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

/** 사진 포함 여부 필터 설정 */
export interface HasPhotoFilterConfig {
  type: 'hasPhoto';
  /** true: 사진 있는 트윗, false: 사진 없는 트윗 */
  hasPhoto: boolean;
}

/** 동영상 포함 여부 필터 설정 */
export interface HasVideoFilterConfig {
  type: 'hasVideo';
  /** true: 동영상 있는 트윗, false: 동영상 없는 트윗 */
  hasVideo: boolean;
}

/** 답글 필터 설정 */
export interface ReplyFilterConfig {
  type: 'reply';
  /** true: 답글만 보존, false: 답글 아닌 것만 보존 */
  isReply: boolean;
}

/** 타래 필터 설정 */
export interface ThreadFilterConfig {
  type: 'thread';
  /** 보존할 타래의 conversation ID 또는 트윗 ID 목록 */
  preservedIds: string[];
}

/** 시작일 필터 설정 */
export interface StartDateFilterConfig {
  type: 'startDate';
  /** 시작일 (ISO 문자열) */
  startDate: string;
}

/** 종료일 필터 설정 */
export interface EndDateFilterConfig {
  type: 'endDate';
  /** 종료일 (ISO 문자열) */
  endDate: string;
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
  | HasPhotoFilterConfig
  | HasVideoFilterConfig
  | ReplyFilterConfig
  | ThreadFilterConfig
  | StartDateFilterConfig
  | EndDateFilterConfig
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
