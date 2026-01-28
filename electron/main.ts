import * as path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, session } from 'electron';
import { TwitterApiClient } from './twitter/api';
import { parseArchive } from './twitter/archive';

let mainWindow: BrowserWindow | null = null;
let twitterClient: TwitterApiClient | null = null;

// Twitter 웹 클라이언트용 공개 Bearer 토큰
const TWITTER_BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

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

ipcMain.handle(
  'twitter:verify',
  async (
    _event,
    auth: {
      authToken: string;
      csrfToken: string;
      bearerToken: string;
    },
  ) => {
    try {
      twitterClient = new TwitterApiClient(auth);
      const user = await twitterClient.verifyCredentials();
      return { success: true, data: user };
    } catch (error) {
      twitterClient = null;
      return { success: false, error: (error as Error).message };
    }
  },
);

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

ipcMain.handle('twitter:delete-batch', async (_event, tweetIds: string[]) => {
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
    await new Promise((resolve) =>
      setTimeout(resolve, 200 + Math.random() * 300),
    );
  }

  return { success: true, data: results };
});

ipcMain.handle('twitter:parse-archive', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [{ name: 'ZIP 또는 JS 파일', extensions: ['zip', 'js'] }],
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
    const fs = await import('node:fs/promises');
    await fs.writeFile(result.filePath, data, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('twitter:login', async () => {
  return new Promise((resolve) => {
    // 로그인 전용 세션 생성 (기존 세션과 분리)
    const loginSession = session.fromPartition('twitter-login');

    const loginWindow = new BrowserWindow({
      width: 500,
      height: 700,
      parent: mainWindow!,
      modal: true,
      webPreferences: {
        session: loginSession,
        nodeIntegration: false,
        contextIsolation: true,
      },
      show: false,
    });

    let authToken = '';
    let csrfToken = '';
    let resolved = false;

    const cleanup = () => {
      if (!loginWindow.isDestroyed()) {
        loginWindow.close();
      }
    };

    const resolveOnce = (result: {
      success: boolean;
      data?: unknown;
      error?: string;
    }) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(result);
    };

    // 쿠키 추출 함수
    const extractCookies = async () => {
      try {
        const cookies = await loginSession.cookies.get({ domain: '.x.com' });
        for (const cookie of cookies) {
          if (cookie.name === 'auth_token') {
            authToken = cookie.value;
          } else if (cookie.name === 'ct0') {
            csrfToken = cookie.value;
          }
        }
        return authToken && csrfToken;
      } catch {
        return false;
      }
    };

    // 로그인 완료 감지
    const checkLoginComplete = async (url: string) => {
      // 로그인 성공 후 홈이나 메인 페이지로 리다이렉트
      if (
        url.includes('x.com/home') ||
        url === 'https://x.com/' ||
        url === 'https://x.com'
      ) {
        const hasTokens = await extractCookies();
        if (hasTokens) {
          resolveOnce({
            success: true,
            data: {
              authToken,
              csrfToken,
              bearerToken: TWITTER_BEARER_TOKEN,
            },
          });
        }
      }
    };

    loginWindow.webContents.on('did-navigate', (_event, url) => {
      checkLoginComplete(url);
    });

    loginWindow.webContents.on('did-navigate-in-page', (_event, url) => {
      checkLoginComplete(url);
    });

    // 창이 닫히면 취소로 처리
    loginWindow.on('closed', () => {
      resolveOnce({ success: false, error: '로그인이 취소되었습니다.' });
    });

    loginWindow.once('ready-to-show', () => {
      loginWindow.show();
    });

    // 로그인 페이지 로드
    loginWindow.loadURL('https://x.com/i/flow/login');
  });
});
