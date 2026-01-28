'use client';

import { useEffect, useState } from 'react';
import { isElectron, login } from '@/lib/ipc';
import { useVerifyAuth } from '@/lib/queries';
import { useAppDispatch } from '@/lib/store/tweet-store';
import type { TwitterAuth } from '@/types';

const STORAGE_KEY = 'x-manager-warning-dismissed';

export default function AuthForm() {
  const dispatch = useAppDispatch();
  const verifyMutation = useVerifyAuth();
  const [auth, setAuth] = useState<TwitterAuth>({
    authToken: '',
    csrfToken: '',
    bearerToken: '',
  });
  const [error, setError] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    setWarningDismissed(dismissed);
  }, []);

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

    setIsLoggingIn(true);

    try {
      const loginResult = await login();

      if (!loginResult.success || !loginResult.data) {
        setError(loginResult.error || '로그인에 실패했습니다.');
        setIsLoggingIn(false);
        return;
      }

      const { auth: authData, user: userData } = loginResult.data;

      dispatch({
        type: 'SET_AUTH',
        payload: { auth: authData, user: userData },
      });
      setIsLoggingIn(false);
    } catch (err) {
      setError((err as Error).message);
      setIsLoggingIn(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!auth.authToken || !auth.csrfToken || !auth.bearerToken) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    if (!isElectron()) {
      setError(
        'Electron 환경에서만 사용할 수 있습니다. 데스크톱 앱으로 실행해주세요.',
      );
      return;
    }

    verifyMutation.mutate(auth, {
      onSuccess: (result) => {
        if (result.success && result.data) {
          dispatch({ type: 'SET_AUTH', payload: { auth, user: result.data } });
        } else {
          setError(result.error || '인증에 실패했습니다.');
        }
      },
      onError: (err) => {
        setError(err.message);
      },
    });
  };

  const isLoading = isLoggingIn || verifyMutation.isPending;

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6">Twitter(X) 인증</h2>

      {/* Twitter 로그인 버튼 */}
      <button
        type="button"
        onClick={handleLoginClick}
        disabled={isLoading}
        className="w-full py-3 px-4 bg-black hover:bg-neutral-800 disabled:bg-neutral-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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

      {/* 수동 입력 토글 */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowManualForm(!showManualForm)}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showManualForm ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          수동으로 토큰 입력 (고급)
        </button>

        {showManualForm && (
          <div className="mt-4">
            <div className="mb-4 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm">
              <h3 className="font-semibold mb-2">인증 정보 얻는 방법</h3>
              <ol className="list-decimal list-inside space-y-1 text-neutral-600 dark:text-neutral-400">
                <li>X.com에 로그인합니다</li>
                <li>DevTools를 엽니다 (F12 또는 Cmd+Option+I)</li>
                <li>Network 탭에서 아무 API 요청을 선택합니다</li>
                <li>
                  Request Headers에서{' '}
                  <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded">
                    authorization
                  </code>{' '}
                  값을 복사합니다 (Bearer 토큰)
                </li>
                <li>
                  Cookies에서{' '}
                  <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded">
                    auth_token
                  </code>
                  과{' '}
                  <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded">
                    ct0
                  </code>{' '}
                  값을 복사합니다
                </li>
              </ol>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <label className="block">
                <span className="block text-sm font-medium mb-1">
                  auth_token (쿠키)
                </span>
                <input
                  type="password"
                  value={auth.authToken}
                  onChange={(e) =>
                    setAuth((prev) => ({ ...prev, authToken: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="auth_token 값을 붙여넣으세요"
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium mb-1">
                  ct0 (CSRF 토큰)
                </span>
                <input
                  type="password"
                  value={auth.csrfToken}
                  onChange={(e) =>
                    setAuth((prev) => ({ ...prev, csrfToken: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ct0 값을 붙여넣으세요"
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium mb-1">
                  Bearer 토큰
                </span>
                <input
                  type="password"
                  value={auth.bearerToken}
                  onChange={(e) =>
                    setAuth((prev) => ({
                      ...prev,
                      bearerToken: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAA... 형태"
                />
              </label>

              <button
                type="submit"
                disabled={verifyMutation.isPending}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
              >
                {verifyMutation.isPending ? '확인 중...' : '인증 확인'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 보안 경고 모달 */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-amber-500 text-2xl flex-shrink-0">
                &#9888;
              </span>
              <div>
                <h3 className="font-bold text-lg mb-2">보안 경고</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                  이 앱은 Twitter 계정에 대한 전체 접근 권한을 요청합니다. 트윗
                  삭제를 포함한 모든 작업이 가능합니다.
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  <strong className="text-foreground">
                    이 프로그램의 개발자를 신뢰하는 경우에만 로그인하세요.
                  </strong>
                  <br />
                  인증 정보는 로컬에만 저장되며 외부로 전송되지 않습니다.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300"
              />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                다시 보지 않기
              </span>
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="flex-1 py-2 px-4 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleWarningConfirm}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                동의하고 계속
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 경고 메시지 재활성화 함수 (외부에서 호출) */
export function resetWarningDismissed() {
  localStorage.removeItem(STORAGE_KEY);
}
