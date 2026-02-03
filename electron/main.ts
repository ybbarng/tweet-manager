import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  protocol,
  session,
  shell,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import { DELETE_BATCH, HISTORY, TWITTER_BEARER_TOKEN } from './constants';
import {
  clearDebugResponses,
  getDebugExportData,
  TwitterApiClient,
} from './twitter/api';
import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from './utils/auth-storage';
import { failure, handleIpc, success } from './utils/ipc';
import { logger } from './utils/logger';

const isDev = !app.isPackaged;
const isMac = process.platform === 'darwin';

// 자동 업데이트 설정
// macOS: 코드 서명 없이는 자동 설치 불가, 알림만 표시
// Windows: 자동 다운로드 및 설치 가능
autoUpdater.autoDownload = !isMac;
autoUpdater.autoInstallOnAppQuit = !isMac;

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

/** 인증 확인 헬퍼 - 미인증 시 예외 발생 */
function requireAuth(): TwitterApiClient {
  if (!twitterClient) throw new Error('인증되지 않았습니다.');
  return twitterClient;
}

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

  // 외부 링크를 기본 브라우저로 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
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

  // 프로덕션에서 자동 업데이트 체크
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// 자동 업데이트 이벤트 핸들러
autoUpdater.on('checking-for-update', () => {
  logger.log('[AutoUpdater] 업데이트 확인 중...');
});

autoUpdater.on('update-available', (info) => {
  logger.log('[AutoUpdater] 업데이트 발견:', info.version);

  // 렌더러에 업데이트 가능 알림
  mainWindow?.webContents.send('update:available', info.version);

  // macOS: 코드 서명 없이는 자동 설치 불가, 수동 다운로드 안내
  if (isMac && mainWindow) {
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: '새 버전 발견',
        message: `새 버전 ${info.version}이 있습니다.`,
        detail: 'GitHub에서 새 버전을 다운로드해주세요.',
        buttons: ['다운로드 페이지 열기', '나중에'],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) {
          shell.openExternal(
            `https://github.com/ybbarng/tweet-manager/releases/tag/v${info.version}`,
          );
        }
      });
  }
});

autoUpdater.on('update-not-available', (info) => {
  logger.log('[AutoUpdater] 최신 버전입니다:', info.version);
});

autoUpdater.on('download-progress', (progress) => {
  logger.log(`[AutoUpdater] 다운로드 중: ${Math.round(progress.percent)}%`);
});

autoUpdater.on('update-downloaded', (info) => {
  logger.log('[AutoUpdater] 업데이트 다운로드 완료:', info.version);
  // 사용자에게 알림
  if (mainWindow) {
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: '업데이트 준비 완료',
        message: `새 버전 ${info.version}이 다운로드되었습니다.`,
        detail: '앱을 재시작하면 업데이트가 적용됩니다.',
        buttons: ['지금 재시작', '나중에'],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  }
});

autoUpdater.on('error', (err) => {
  logger.error('[AutoUpdater] 에러:', err);
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
        .replace(/\s*tweet-manager\/[\d.]+\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      logger.log('[twitter:verify] 인증 시도:', {
        authToken: `${auth.authToken?.slice(0, 10)}...`,
        csrfToken: `${auth.csrfToken?.slice(0, 10)}...`,
        userId: auth.userId,
        userAgent: `${userAgent.slice(0, 50)}...`,
      });
      // userId가 없으면 에러 (Viewer API가 404를 반환하므로)
      if (!auth.userId) {
        logger.error('[twitter:verify] userId 없음');
        return {
          success: false,
          error: 'userId가 없습니다. 다시 로그인해주세요.',
        };
      }

      twitterClient = new TwitterApiClient({ ...auth, userAgent });
      logger.log('[twitter:verify] 성공:', { id: auth.userId });
      return { success: true, data: { id: auth.userId } };
    } catch (error) {
      logger.error('[twitter:verify] 실패:', error);
      twitterClient = null;
      return { success: false, error: (error as Error).message };
    }
  },
);

ipcMain.handle(
  'twitter:fetch-tweets',
  (_event, cursor?: string, pageNumber?: number, count?: number) =>
    handleIpc(() =>
      requireAuth().fetchUserTweets(cursor, pageNumber ?? 1, count ?? 20),
    ),
);

ipcMain.handle('twitter:delete-tweet', (_event, tweetId: string) =>
  handleIpc(async () => {
    await requireAuth().deleteTweet(tweetId);
  }),
);

ipcMain.handle('twitter:delete-batch', async (_event, tweetIds: string[]) => {
  let client: TwitterApiClient;
  try {
    client = requireAuth();
  } catch (error) {
    return failure(error);
  }

  const results = {
    total: tweetIds.length,
    completed: 0,
    failed: 0,
    failedTweetIds: [] as { id: string; error: string }[],
  };
  let consecutiveFailures = 0;

  for (const tweetId of tweetIds) {
    try {
      await client.deleteTweet(tweetId);
      results.completed++;
      consecutiveFailures = 0; // 성공 시 연속 실패 카운터 리셋
    } catch (error) {
      results.failed++;
      consecutiveFailures++;
      results.failedTweetIds.push({
        id: tweetId,
        error: (error as Error).message,
      });

      // 연속 실패 시 중단
      if (consecutiveFailures >= DELETE_BATCH.MAX_CONSECUTIVE_FAILURES) {
        mainWindow?.webContents.send('twitter:delete-progress', {
          ...results,
          currentTweetId: tweetId,
          status: 'stopped',
          stopReason: `연속 ${DELETE_BATCH.MAX_CONSECUTIVE_FAILURES}회 실패로 중단됨`,
        });
        return {
          success: false,
          error: `연속 ${DELETE_BATCH.MAX_CONSECUTIVE_FAILURES}회 실패로 삭제가 중단되었습니다.`,
          data: results,
        };
      }
    }

    // 진행 상태를 렌더러에 전송
    mainWindow?.webContents.send('twitter:delete-progress', {
      ...results,
      currentTweetId: tweetId,
      status: 'running',
    });

    // Rate limit 대응: 랜덤 딜레이 (계정 보호)
    const delay =
      DELETE_BATCH.DELAY_MIN_MS +
      Math.random() * (DELETE_BATCH.DELAY_MAX_MS - DELETE_BATCH.DELAY_MIN_MS);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return { success: true, data: results };
});

ipcMain.handle('twitter:save-backup', async (_event, data: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: `tweets-backup-${Date.now()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (result.canceled || !result.filePath) {
    return failure('저장이 취소되었습니다.');
  }

  try {
    await fsPromises.writeFile(result.filePath, data, 'utf-8');
    return success();
  } catch (error) {
    return failure(error);
  }
});

// 디버그 데이터 내보내기
ipcMain.handle('debug:export', async () => {
  const debugData = getDebugExportData();

  if (debugData.responseCount === 0) {
    return failure('내보낼 API 응답이 없습니다. 트윗을 먼저 불러와주세요.');
  }

  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: `api-debug-${Date.now()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (result.canceled || !result.filePath) {
    return failure('저장이 취소되었습니다.');
  }

  try {
    await fsPromises.writeFile(
      result.filePath,
      JSON.stringify(debugData, null, 2),
      'utf-8',
    );
    return success({ responseCount: debugData.responseCount });
  } catch (error) {
    return failure(error);
  }
});

// 디버그 데이터 초기화
ipcMain.handle('debug:clear', () => {
  clearDebugResponses();
  return success();
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
            // twitterClient 초기화
            twitterClient = new TwitterApiClient({
              authToken,
              csrfToken,
              bearerToken: TWITTER_BEARER_TOKEN,
              userId,
            });

            // DOM에서 사용자 정보 추출 시도
            const userInfo = await extractUserInfo();

            // DOM 추출 실패해도 계속 진행 (screenName은 트윗 로드 시 추출됨)
            if (!userInfo?.screenName) {
              logger.log(
                '[twitter:login] DOM에서 사용자 정보 추출 실패, 트윗 로드 시 추출 예정',
              );
            }

            logger.log('[twitter:login] 로그인 성공:', {
              userId,
              screenName: userInfo?.screenName,
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

// --- 삭제 히스토리 IPC 핸들러 ---

interface DeletionHistoryEntry {
  id: string;
  deletedAt: string;
  count: number;
  failedCount: number;
}

function getHistoryFilePath(): string {
  return path.join(app.getPath('userData'), 'deletion-history.json');
}

ipcMain.handle('history:load', () =>
  handleIpc(async () => {
    const filePath = getHistoryFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = await fsPromises.readFile(filePath, 'utf-8');
    return JSON.parse(content) as DeletionHistoryEntry[];
  }),
);

ipcMain.handle('history:save', (_event, entry: DeletionHistoryEntry) =>
  handleIpc(async () => {
    const filePath = getHistoryFilePath();
    let history: DeletionHistoryEntry[] = [];

    if (fs.existsSync(filePath)) {
      const content = await fsPromises.readFile(filePath, 'utf-8');
      history = JSON.parse(content);
    }

    history.unshift(entry);

    // 최근 항목만 유지
    if (history.length > HISTORY.MAX_ENTRIES) {
      history = history.slice(0, HISTORY.MAX_ENTRIES);
    }

    await fsPromises.writeFile(filePath, JSON.stringify(history, null, 2));
  }),
);

// --- 인증 저장소 IPC 핸들러 ---

ipcMain.handle(
  'auth:save',
  (
    _event,
    data: {
      auth: { authToken: string; csrfToken: string; bearerToken: string };
      user: {
        id: string;
        name: string;
        screenName: string;
        profileImageUrl: string;
      };
    },
  ) =>
    handleIpc(() => {
      saveCredentials(data);
    }),
);

ipcMain.handle('auth:load', () =>
  handleIpc(() => {
    return loadCredentials();
  }),
);

ipcMain.handle('auth:clear', () =>
  handleIpc(() => {
    clearCredentials();
  }),
);
