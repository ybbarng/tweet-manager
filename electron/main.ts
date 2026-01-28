import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { TwitterApiClient } from './twitter/api';
import { parseArchive } from './twitter/archive';

let mainWindow: BrowserWindow | null = null;
let twitterClient: TwitterApiClient | null = null;

const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  if (isDev) {
    const port = process.env.PORT || '3000';
    mainWindow.loadURL(`http://localhost:${port}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// --- IPC 핸들러 ---

ipcMain.handle('twitter:verify', async (_event, auth: {
  authToken: string;
  csrfToken: string;
  bearerToken: string;
}) => {
  try {
    twitterClient = new TwitterApiClient(auth);
    const user = await twitterClient.verifyCredentials();
    return { success: true, data: user };
  } catch (error) {
    twitterClient = null;
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('twitter:fetch-tweets', async (_event, cursor?: string) => {
  if (!twitterClient) {
    return { success: false, error: '인증되지 않았습니다.' };
  }
  try {
    const result = await twitterClient.fetchUserTweets(cursor);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('twitter:delete-tweet', async (_event, tweetId: string) => {
  if (!twitterClient) {
    return { success: false, error: '인증되지 않았습니다.' };
  }
  try {
    await twitterClient.deleteTweet(tweetId);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('twitter:delete-batch', async (event, tweetIds: string[]) => {
  if (!twitterClient) {
    return { success: false, error: '인증되지 않았습니다.' };
  }

  const results = { total: tweetIds.length, completed: 0, failed: 0 };

  for (const tweetId of tweetIds) {
    try {
      await twitterClient.deleteTweet(tweetId);
      results.completed++;
    } catch {
      results.failed++;
    }

    // 진행 상태를 렌더러에 전송
    mainWindow?.webContents.send('twitter:delete-progress', {
      ...results,
      currentTweetId: tweetId,
      status: 'running',
    });

    // Rate limit 대응: 200~500ms 랜덤 딜레이
    await new Promise(resolve =>
      setTimeout(resolve, 200 + Math.random() * 300)
    );
  }

  return { success: true, data: results };
});

ipcMain.handle('twitter:parse-archive', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'ZIP 또는 JS 파일', extensions: ['zip', 'js'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, error: '파일이 선택되지 않았습니다.' };
  }

  try {
    const tweets = await parseArchive(result.filePaths[0]);
    return { success: true, data: tweets };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('twitter:save-backup', async (_event, data: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: `tweets-backup-${Date.now()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, error: '저장이 취소되었습니다.' };
  }

  try {
    const fs = await import('fs/promises');
    await fs.writeFile(result.filePath, data, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});
