/** 쓰레드 정보 */
export interface ThreadInfo {
  /** 쓰레드 내 트윗 수 */
  size: number;
  /** 쓰레드 시작 트윗 ID */
  startTweetId: string;
  /** 쓰레드 시작 날짜 */
  startTweetDate: string;
}

/** 트윗 데이터 */
export interface Tweet {
  id: string;
  text: string;
  createdAt: Date;
  likes: number;
  retweets: number;
  replies: number;
  /** 조회수 (없을 수 있음) */
  views?: number;
  /** 답글 대상 트윗 ID */
  inReplyToId?: string;
  /** 타래(스레드) 식별용 */
  conversationId?: string;
  isRetweet: boolean;
  media?: { type: string; url: string }[];
  /** 쓰레드의 일부인 경우 쓰레드 정보 */
  threadInfo?: ThreadInfo;
}

/** Twitter 인증 정보 */
export interface TwitterAuth {
  /** auth_token 쿠키 */
  authToken: string;
  /** ct0 쿠키 (CSRF 토큰) */
  csrfToken: string;
  /** Authorization 헤더의 Bearer 토큰 */
  bearerToken: string;
}

/** Twitter 사용자 정보 */
export interface TwitterUser {
  id: string;
  name: string;
  screenName: string;
  profileImageUrl: string;
}

/** 트윗 필터 인터페이스 */
export interface TweetFilter {
  id: string;
  type: string;
  enabled: boolean;
  /** 보존할 트윗을 반환 */
  apply: (tweets: Tweet[]) => Tweet[];
}

/** 삭제 진행 상태 */
export interface DeletionProgress {
  total: number;
  completed: number;
  failed: number;
  currentTweetId?: string;
  status: 'idle' | 'running' | 'paused' | 'done' | 'error' | 'stopped';
  error?: string;
  stopReason?: string;
  /** 실패한 트윗 목록 */
  failedTweetIds?: { id: string; error: string }[];
}

/** 앱 전체 상태 */
export interface AppState {
  auth: TwitterAuth | null;
  user: TwitterUser | null;
  tweets: Tweet[];
  filters: TweetFilter[];
  /** 삭제 대상에서 수동으로 제외한 트윗 ID */
  excludedTweetIds: Set<string>;
  deletionProgress: DeletionProgress;
}

/** IPC 응답 래퍼 */
export interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** 테마 모드 */
export type ThemeMode = 'system' | 'light' | 'dark';

/** 삭제 히스토리 항목 */
export interface DeletionHistoryEntry {
  id: string;
  deletedAt: string;
  count: number;
  failedCount: number;
}
