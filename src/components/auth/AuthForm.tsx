'use client';

import { useState } from 'react';
import { isElectron } from '@/lib/ipc';
import { useVerifyAuth } from '@/lib/queries';
import { useAppDispatch } from '@/lib/store/tweet-store';
import type { TwitterAuth } from '@/types';

export default function AuthForm() {
  const dispatch = useAppDispatch();
  const verifyMutation = useVerifyAuth();
  const [auth, setAuth] = useState<TwitterAuth>({
    authToken: '',
    csrfToken: '',
    bearerToken: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6">Twitter(X) 인증</h2>

      <div className="mb-6 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm">
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

      <form onSubmit={handleSubmit} className="space-y-4">
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
          <span className="block text-sm font-medium mb-1">Bearer 토큰</span>
          <input
            type="password"
            value={auth.bearerToken}
            onChange={(e) =>
              setAuth((prev) => ({ ...prev, bearerToken: e.target.value }))
            }
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAA... 형태"
          />
        </label>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={verifyMutation.isPending}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
        >
          {verifyMutation.isPending ? '확인 중...' : '인증 확인'}
        </button>
      </form>
    </div>
  );
}
