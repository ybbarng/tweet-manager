import type {
  DeletionHistoryEntry,
  DeletionProgress,
  IpcResponse,
  Tweet,
  TwitterAuth,
  TwitterUser,
} from '@/types';

/** 로그인 결과 (인증 정보 + 사용자 정보) */
export interface LoginResult {
  auth: TwitterAuth;
  user: TwitterUser;
}

/** Electron IPC API 타입 정의 */
interface ElectronAPI {
  onUpdateAvailable: (callback: (version: string) => void) => () => void;
  debug: {
    export: () => Promise<IpcResponse<{ responseCount: number }>>;
    clear: () => Promise<IpcResponse<void>>;
  };
  auth: {
    save: (data: LoginResult) => Promise<IpcResponse<void>>;
    load: () => Promise<IpcResponse<LoginResult | null>>;
    clear: () => Promise<IpcResponse<void>>;
  };
  history: {
    load: () => Promise<IpcResponse<DeletionHistoryEntry[]>>;
    save: (entry: DeletionHistoryEntry) => Promise<IpcResponse<void>>;
  };
  twitter: {
    login: () => Promise<IpcResponse<LoginResult>>;
    verify: (auth: TwitterAuth) => Promise<IpcResponse<TwitterUser>>;
    fetchTweets: (
      cursor?: string,
      pageNumber?: number,
      count?: number,
    ) => Promise<IpcResponse<{ tweets: Tweet[]; nextCursor?: string }>>;
    deleteTweet: (tweetId: string) => Promise<IpcResponse<void>>;
    deleteBatch: (tweetIds: string[]) => Promise<
      IpcResponse<{
        total: number;
        completed: number;
        failed: number;
        failedTweetIds?: { id: string; error: string }[];
      }>
    >;
    saveBackup: (data: string) => Promise<IpcResponse<void>>;
    onDeleteProgress: (
      callback: (progress: DeletionProgress) => void,
    ) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

function getAPI(): ElectronAPI {
  if (typeof window === 'undefined' || !window.electronAPI) {
    throw new Error(
      'Electron API를 사용할 수 없습니다. Electron 환경에서 실행해주세요.',
    );
  }
  return window.electronAPI;
}

/** Electron 환경인지 확인 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

/** 인증 정보 저장 */
export async function saveAuth(data: LoginResult): Promise<IpcResponse<void>> {
  return getAPI().auth.save(data);
}

/** 저장된 인증 정보 로드 */
export async function loadAuth(): Promise<IpcResponse<LoginResult | null>> {
  return getAPI().auth.load();
}

/** 저장된 인증 정보 삭제 */
export async function clearAuth(): Promise<IpcResponse<void>> {
  return getAPI().auth.clear();
}

/** Twitter 자동 로그인 */
export async function login(): Promise<IpcResponse<LoginResult>> {
  return getAPI().twitter.login();
}

/** 인증 정보 검증 */
export async function verifyAuth(
  auth: TwitterAuth,
): Promise<IpcResponse<TwitterUser>> {
  return getAPI().twitter.verify(auth);
}

/** 트윗 조회 (페이지네이션) */
export async function fetchTweets(
  cursor?: string,
  pageNumber?: number,
  count?: number,
): Promise<
  IpcResponse<{ tweets: Tweet[]; nextCursor?: string; user?: TwitterUser }>
> {
  return getAPI().twitter.fetchTweets(cursor, pageNumber, count);
}

/** 단일 트윗 삭제 */
export async function deleteTweet(tweetId: string) {
  return getAPI().twitter.deleteTweet(tweetId);
}

/** 일괄 트윗 삭제 */
export async function deleteBatch(tweetIds: string[]) {
  return getAPI().twitter.deleteBatch(tweetIds);
}

/** 백업 저장 */
export async function saveBackup(data: string) {
  return getAPI().twitter.saveBackup(data);
}

/** 삭제 진행 상태 구독 */
export function onDeleteProgress(
  callback: (progress: DeletionProgress) => void,
): () => void {
  return getAPI().twitter.onDeleteProgress(callback);
}

/** 업데이트 가능 알림 구독 */
export function onUpdateAvailable(
  callback: (version: string) => void,
): () => void {
  if (typeof window === 'undefined' || !window.electronAPI) {
    return () => {};
  }
  return window.electronAPI.onUpdateAvailable(callback);
}

/** 삭제 히스토리 로드 */
export async function loadHistory(): Promise<
  IpcResponse<DeletionHistoryEntry[]>
> {
  return getAPI().history.load();
}

/** 삭제 히스토리 저장 */
export async function saveHistory(
  entry: DeletionHistoryEntry,
): Promise<IpcResponse<void>> {
  return getAPI().history.save(entry);
}

/** 디버그 데이터 내보내기 */
export async function exportDebugData(): Promise<
  IpcResponse<{ responseCount: number }>
> {
  return getAPI().debug.export();
}

/** 디버그 데이터 초기화 */
export async function clearDebugData(): Promise<IpcResponse<void>> {
  return getAPI().debug.clear();
}
