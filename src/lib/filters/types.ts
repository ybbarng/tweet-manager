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

export type FilterConfig = LikesFilterConfig | RetweetsFilterConfig | ThreadFilterConfig;

/** 필터 함수 시그니처 */
export type FilterFn = (tweets: Tweet[]) => Tweet[];
