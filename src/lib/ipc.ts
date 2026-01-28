import type {
  DeletionProgress,
  IpcResponse,
  Tweet,
  TwitterAuth,
  TwitterUser,
} from '@/types';

/** Electron IPC API 타입 정의 */
interface ElectronAPI {
  twitter: {
    verify: (auth: TwitterAuth) => Promise<IpcResponse<TwitterUser>>;
    fetchTweets: (
      cursor?: string,
    ) => Promise<IpcResponse<{ tweets: Tweet[]; nextCursor?: string }>>;
    deleteTweet: (tweetId: string) => Promise<IpcResponse<void>>;
    deleteBatch: (
      tweetIds: string[],
    ) => Promise<
      IpcResponse<{ total: number; completed: number; failed: number }>
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
