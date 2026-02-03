'use client';

import { useEffect, useState } from 'react';
import {
  clearAuth,
  isElectron,
  loadAuth,
  login,
  saveAuth,
  verifyAuth,
} from '@/lib/ipc';
import { useAppStore } from '@/lib/store/app-store';
import AutoLoginLoader from './AutoLoginLoader';
import SecurityWarningModal from './SecurityWarningModal';

const STORAGE_KEY = 'tweet-manager-warning-dismissed';
const MANUAL_LOGOUT_KEY = 'tweet-manager-manual-logout';

export function resetWarningDismissed() {
  localStorage.removeItem(STORAGE_KEY);
}

export function isWarningDismissed() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setManualLogout(value: boolean) {
  if (value) {
    localStorage.setItem(MANUAL_LOGOUT_KEY, 'true');
  } else {
    localStorage.removeItem(MANUAL_LOGOUT_KEY);
  }
}

export function isManualLogout() {
  return localStorage.getItem(MANUAL_LOGOUT_KEY) === 'true';
}

type AuthStatus =
  | 'checking'
  | 'logging-in'
  | 'idle'
  | 'error'
  | 'has-saved-auth';

const MIN_LOADING_DISPLAY_MS = 1500;

export default function AuthForm() {
  const setAuth = useAppStore((s) => s.setAuth);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [autoLoginError, setAutoLoginError] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [savedAuthData, setSavedAuthData] = useState<{
    auth: Parameters<typeof setAuth>[0];
    user: Parameters<typeof setAuth>[1];
  } | null>(null);

  useEffect(() => {
    setWarningDismissed(isWarningDismissed());
  }, []);

  // 자동 로그인 시도
  useEffect(() => {
    if (!isElectron()) {
      setAuthStatus('idle');
      return;
    }

    const attemptAutoLogin = async () => {
      const startTime = Date.now();

      const ensureMinDisplayTime = async () => {
        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_LOADING_DISPLAY_MS) {
          await new Promise((r) =>
            setTimeout(r, MIN_LOADING_DISPLAY_MS - elapsed),
          );
        }
      };

      try {
        const result = await loadAuth();

        if (!result.success || !result.data) {
          await ensureMinDisplayTime();
          setAuthStatus('idle');
          return;
        }

        const { auth, user } = result.data;

        // 수동 로그아웃 상태면 버튼만 표시
        if (isManualLogout()) {
          await ensureMinDisplayTime();
          setSavedAuthData({ auth, user });
          setAuthStatus('has-saved-auth');
          return;
        }

        // 저장된 인증 정보로 유효성 검증
        const verifyResult = await verifyAuth({
          ...auth,
          userId: user.id,
        } as Parameters<typeof verifyAuth>[0]);

        if (!verifyResult.success || !verifyResult.data) {
          // 토큰 만료 또는 무효화됨
          await clearAuth();
          await ensureMinDisplayTime();
          setAutoLoginError('저장된 로그인 정보가 만료되었습니다.');
          setAuthStatus('error');
          // 3초 후 로그인 화면으로 전환
          setTimeout(() => {
            setAutoLoginError(null);
            setAuthStatus('idle');
          }, 3000);
          return;
        }

        // 자동 로그인 성공 (screenName은 트윗 로드 시 추출됨)
        await ensureMinDisplayTime();
        setAuth(auth, user);
      } catch (err) {
        await ensureMinDisplayTime();
        setAutoLoginError((err as Error).message);
        setAuthStatus('error');
        setTimeout(() => {
          setAutoLoginError(null);
          setAuthStatus('idle');
        }, 3000);
      }
    };

    attemptAutoLogin();
  }, [setAuth]);

  // 저장된 인증 정보로 로그인
  const handleUseSavedAuth = async () => {
    if (!savedAuthData) return;

    setManualLogout(false);
    setAuthStatus('logging-in');

    try {
      // 저장된 인증 정보의 유효성 재검증
      const verifyResult = await verifyAuth({
        ...savedAuthData.auth,
        userId: savedAuthData.user.id,
      } as Parameters<typeof verifyAuth>[0]);

      if (!verifyResult.success || !verifyResult.data) {
        await clearAuth();
        setError('저장된 로그인 정보가 만료되었습니다. 다시 로그인해주세요.');
        setAuthStatus('idle');
        setSavedAuthData(null);
        return;
      }

      setAuth(savedAuthData.auth, savedAuthData.user);
    } catch (err) {
      setError((err as Error).message);
      setAuthStatus('has-saved-auth');
    }
  };

  // 새로 로그인하기
  const handleNewLogin = async () => {
    setManualLogout(false);
    await clearAuth();
    setSavedAuthData(null);
    setAuthStatus('idle');
  };

  const handleLoginClick = () => {
    if (warningDismissed) {
      proceedWithLogin();
    } else {
      setShowWarningModal(true);
    }
  };

  const handleWarningConfirm = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setWarningDismissed(true);
    }
    setShowWarningModal(false);
    proceedWithLogin();
  };

  const proceedWithLogin = async () => {
    setError('');

    if (!isElectron()) {
      setError(
        'Electron 환경에서만 사용할 수 있습니다. 데스크톱 앱으로 실행해주세요.',
      );
      return;
    }

    setAuthStatus('logging-in');

    try {
      const loginResult = await login();

      if (!loginResult.success || !loginResult.data) {
        setError(loginResult.error || '로그인에 실패했습니다.');
        setAuthStatus('idle');
        return;
      }

      const { auth: authData, user: userData } = loginResult.data;

      // 인증 정보 저장
      await saveAuth({ auth: authData, user: userData });

      setManualLogout(false);
      setAuth(authData, userData);
    } catch (err) {
      setError((err as Error).message);
      setAuthStatus('idle');
    }
  };

  // 자동 로그인 중 또는 에러 상태
  if (authStatus === 'checking' || authStatus === 'error') {
    return <AutoLoginLoader error={autoLoginError} />;
  }

  const isLoading = authStatus === 'logging-in';

  // 저장된 인증 정보가 있지만 수동 로그아웃 상태
  if (authStatus === 'has-saved-auth' && savedAuthData) {
    return (
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-4">다시 오셨네요!</h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          @{savedAuthData.user.screenName || savedAuthData.user.name}님의 저장된
          로그인 정보가 있습니다.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleUseSavedAuth}
            className="w-full py-3 px-4 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            기존 정보로 로그인하기
          </button>

          <button
            type="button"
            onClick={handleNewLogin}
            className="w-full py-3 px-4 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg font-medium transition-colors"
          >
            다른 계정으로 로그인하기
          </button>
        </div>

        {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}

        <SecurityWarningModal
          open={showWarningModal}
          onClose={() => setShowWarningModal(false)}
          onConfirm={handleWarningConfirm}
          showDontShowAgain
          dontShowAgain={dontShowAgain}
          onDontShowAgainChange={setDontShowAgain}
        />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">시작하기</h2>

      {/* 경고 문구 보기 링크 */}
      <button
        type="button"
        onClick={() => setShowWarningModal(true)}
        className="text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 mb-4 flex items-center gap-1"
      >
        <span>&#9888;</span>
        <span>로그인 전 보안 경고 확인하기</span>
      </button>

      {/* Twitter 로그인 버튼 */}
      <button
        type="button"
        onClick={handleLoginClick}
        disabled={isLoading}
        className="w-full py-3 px-4 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:bg-neutral-500 dark:disabled:bg-neutral-400 text-white dark:text-black rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          '로그인 중...'
        ) : (
          <>
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Twitter로 로그인
          </>
        )}
      </button>

      {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}

      {/* 보안 경고 모달 */}
      <SecurityWarningModal
        open={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        onConfirm={handleWarningConfirm}
        showDontShowAgain
        dontShowAgain={dontShowAgain}
        onDontShowAgainChange={setDontShowAgain}
      />
    </div>
  );
}
