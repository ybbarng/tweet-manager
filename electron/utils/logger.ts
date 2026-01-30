/** 개발 환경 여부 확인 (테스트 환경에서도 안전하게 동작) */
function checkIsDev(): boolean {
  try {
    // Electron 환경
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron');
    return !app.isPackaged;
  } catch {
    // 테스트 환경 또는 Electron 외부
    return process.env.NODE_ENV !== 'production';
  }
}

const isDev = checkIsDev();

/** 개발 환경에서만 로그 출력 */
export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
};
