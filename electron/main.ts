import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  protocol,
  session,
} from 'electron';
import { TwitterApiClient } from './twitter/api';
import { parseArchive } from './twitter/archive';

const isDev = !app.isPackaged;

// 프로덕션 빌드에서 정적 파일 서빙을 위한 커스텀 프로토콜
if (!isDev) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
      },
    },
  ]);
}

let mainWindow: BrowserWindow | null = null;
let twitterClient: TwitterApiClient | null = null;

// Twitter 웹 클라이언트용 공개 Bearer 토큰
const TWITTER_BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, '../resources/icon.png'),
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
    mainWindow.loadURL('app://./index.html');
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 프로덕션에서 커스텀 프로토콜 핸들러 등록
  if (!isDev) {
    const outDir = path.join(__dirname, '../out');
    protocol.handle('app', (request) => {
      const url = new URL(request.url);
      let filePath = path.join(outDir, url.pathname);

      // 디렉토리면 index.html 반환
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      return net.fetch(`file://${filePath}`);
    });
  }

  // macOS Dock 아이콘 설정
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(path.join(__dirname, '../resources/icon.png'));
  }
  createWindow();
});

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
      userId?: string;
    },
  ) => {
    try {
      // Electron User-Agent에서 Electron/앱 이름 제거하여 순수 Chrome처럼 보이게 함
      const rawUserAgent = session.defaultSession.getUserAgent();
      const userAgent = rawUserAgent
        .replace(/\s*Electron\/[\d.]+\s*/g, ' ')
        .replace(/\s*twit-manager\/[\d.]+\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      console.log('[twitter:verify] 인증 시도:', {
        authToken: auth.authToken?.slice(0, 10) + '...',
        csrfToken: auth.csrfToken?.slice(0, 10) + '...',
        userId: auth.userId,
        userAgent: userAgent.slice(0, 50) + '...',
      });
      twitterClient = new TwitterApiClient({ ...auth, userAgent });

      // userId가 있으면 API 호출 없이 인증 성공으로 처리
      if (auth.userId) {
        console.log('[twitter:verify] userId 있음, 인증 완료');
        return {
          success: true,
          data: {
            id: auth.userId,
            name: '',
            screenName: '',
            profileImageUrl: '',
          },
        };
      }

      // userId 없으면 (수동 입력) verifyCredentials 호출
      const user = await twitterClient.verifyCredentials();
      console.log('[twitter:verify] 성공:', user);
      return { success: true, data: user };
    } catch (error) {
      console.error('[twitter:verify] 실패:', error);
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
      modal: false,
      closable: true,
      minimizable: false,
      maximizable: false,
      webPreferences: {
        session: loginSession,
        nodeIntegration: false,
        contextIsolation: true,
      },
      show: false,
    });

    let authToken = '';
    let csrfToken = '';
    let userId = '';
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
          } else if (cookie.name === 'twid') {
            // twid 쿠키 형식: u%3D{userId} (URL 인코딩된 u={userId})
            const match = decodeURIComponent(cookie.value).match(/u=(\d+)/);
            if (match) {
              userId = match[1];
            }
          }
        }
        return authToken && csrfToken && userId;
      } catch {
        return false;
      }
    };

    // 페이지에서 사용자 정보 추출
    const extractUserInfo = async () => {
      try {
        const userInfo = await loginWindow.webContents.executeJavaScript(`
          (function() {
            try {
              // React Fiber에서 사용자 정보 추출 시도
              const appElement = document.querySelector('[data-testid="primaryColumn"]');
              if (!appElement) return null;

              // __reactFiber 또는 __reactInternalInstance에서 상태 탐색
              const fiberKey = Object.keys(appElement).find(key => key.startsWith('__reactFiber'));
              if (!fiberKey) return null;

              // 프로필 링크에서 screen_name 추출
              const profileLink = document.querySelector('[data-testid="AppTabBar_Profile_Link"]');
              const screenName = profileLink ? profileLink.getAttribute('href')?.replace('/', '') : null;

              // 프로필 이미지 추출
              const profileImg = document.querySelector('[data-testid="DashButton_ProfileIcon_Link"] img');
              const profileImageUrl = profileImg ? profileImg.getAttribute('src') : null;

              return { screenName, profileImageUrl };
            } catch (e) {
              return null;
            }
          })()
        `);
        return userInfo;
      } catch {
        return null;
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
          // 페이지 로드 완료 대기 후 사용자 정보 추출
          setTimeout(async () => {
            const userInfo = await extractUserInfo();
            console.log('[twitter:login] 로그인 성공:', {
              userId,
              screenName: userInfo?.screenName,
            });

            // twitterClient 초기화
            twitterClient = new TwitterApiClient({
              authToken,
              csrfToken,
              bearerToken: TWITTER_BEARER_TOKEN,
              userId,
            });

            resolveOnce({
              success: true,
              data: {
                auth: {
                  authToken,
                  csrfToken,
                  bearerToken: TWITTER_BEARER_TOKEN,
                },
                user: {
                  id: userId,
                  name: userInfo?.screenName || userId,
                  screenName: userInfo?.screenName || '',
                  profileImageUrl: userInfo?.profileImageUrl || '',
                },
              },
            });
          }, 1000);
        }
      }
    };

    loginWindow.webContents.on('did-navigate', (_event, url) => {
      checkLoginComplete(url);
    });

    loginWindow.webContents.on('did-navigate-in-page', (_event, url) => {
      checkLoginComplete(url);
    });

    // 브라우저가 닫기를 막으려고 할 때 무시
    loginWindow.webContents.on('will-prevent-unload', (event) => {
      event.preventDefault();
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
