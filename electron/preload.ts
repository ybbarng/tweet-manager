import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 업데이트 관련
  onUpdateAvailable: (callback: (version: string) => void) => {
    const handler = (_event: unknown, version: string) => callback(version);
    ipcRenderer.on('update:available', handler);
    return () => ipcRenderer.removeListener('update:available', handler);
  },

  // 삭제 히스토리
  history: {
    load: () => ipcRenderer.invoke('history:load'),
    save: (entry: {
      id: string;
      deletedAt: string;
      count: number;
      failedCount: number;
    }) => ipcRenderer.invoke('history:save', entry),
  },

  twitter: {
    login: () => ipcRenderer.invoke('twitter:login'),

    verify: (auth: {
      authToken: string;
      csrfToken: string;
      bearerToken: string;
    }) => ipcRenderer.invoke('twitter:verify', auth),

    fetchTweets: (cursor?: string) =>
      ipcRenderer.invoke('twitter:fetch-tweets', cursor),

    deleteTweet: (tweetId: string) =>
      ipcRenderer.invoke('twitter:delete-tweet', tweetId),

    deleteBatch: (tweetIds: string[]) =>
      ipcRenderer.invoke('twitter:delete-batch', tweetIds),

    saveBackup: (data: string) =>
      ipcRenderer.invoke('twitter:save-backup', data),

    onDeleteProgress: (callback: (progress: unknown) => void) => {
      const handler = (_event: unknown, progress: unknown) =>
        callback(progress);
      ipcRenderer.on('twitter:delete-progress', handler);
      return () =>
        ipcRenderer.removeListener('twitter:delete-progress', handler);
    },
  },
});
