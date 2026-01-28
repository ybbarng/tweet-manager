import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
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
