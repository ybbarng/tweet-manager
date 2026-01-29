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
  history: {
    load: () => Promise<IpcResponse<DeletionHistoryEntry[]>>;
    save: (entry: DeletionHistoryEntry) => Promise<IpcResponse<void>>;
  };
  twitter: {
    login: () => Promise<IpcResponse<LoginResult>>;
    verify: (auth: TwitterAuth) => Promise<IpcResponse<TwitterUser>>;
    fetchTweets: (
      cursor?: string,
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
    parseArchive: () => Promise<IpcResponse<Tweet[]>>;
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
export async function fetchTweets(cursor?: string) {
  return getAPI().twitter.fetchTweets(cursor);
}

/** 단일 트윗 삭제 */
export async function deleteTweet(tweetId: string) {
  return getAPI().twitter.deleteTweet(tweetId);
}

/** 일괄 트윗 삭제 */
export async function deleteBatch(tweetIds: string[]) {
  return getAPI().twitter.deleteBatch(tweetIds);
}

/** 아카이브 파일 파싱 */
export async function parseArchive() {
  return getAPI().twitter.parseArchive();
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
