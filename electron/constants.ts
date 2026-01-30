/** Twitter 웹 클라이언트용 공개 Bearer 토큰 */
export const TWITTER_BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

/** 배치 삭제 관련 상수 */
export const DELETE_BATCH = {
  /** 삭제 요청 간 최소 딜레이 (ms) */
  DELAY_MIN_MS: 1000,
  /** 삭제 요청 간 최대 딜레이 (ms) */
  DELAY_MAX_MS: 2000,
  /** 연속 실패 시 중단 임계값 */
  MAX_CONSECUTIVE_FAILURES: 5,
} as const;

/** 삭제 히스토리 관련 상수 */
export const HISTORY = {
  /** 최대 저장 항목 수 */
  MAX_ENTRIES: 100,
} as const;

/** Rate Limit 관련 상수 */
export const RATE_LIMIT = {
  /** 최대 재시도 횟수 */
  MAX_RETRIES: 3,
  /** 재시도 시 기본 대기 시간 (ms) */
  BASE_DELAY_MS: 5000,
  /** 최대 대기 시간 (ms) */
  MAX_WAIT_MS: 60000,
  /** 기본 retry-after 시간 (초) */
  DEFAULT_RETRY_AFTER_SEC: 60,
} as const;
