import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 업데이트 관련
  onUpdateAvailable: (callback: (version: string) => void) => {
    const handler = (_event: unknown, version: string) => callback(version);
    ipcRenderer.on('update:available', handler);
    return () => ipcRenderer.removeListener('update:available', handler);
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

    parseArchive: () => ipcRenderer.invoke('twitter:parse-archive'),

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
