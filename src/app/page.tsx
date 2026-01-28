'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useReducer } from 'react';
import AuthForm, { resetWarningDismissed } from '@/components/auth/AuthForm';
import TweetManager from '@/components/manager/TweetManager';
import { getQueryClient } from '@/lib/query-client';
import {
  AppDispatchContext,
  AppStateContext,
  initialState,
  reducer,
} from '@/lib/store/tweet-store';

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const isAuthenticated = !!state.auth;

  return (
    <QueryClientProvider client={getQueryClient()}>
      <AppStateContext.Provider value={state}>
        <AppDispatchContext.Provider value={dispatch}>
          <div className="min-h-screen bg-background text-foreground">
            {/* 헤더 */}
            <header className="border-b border-neutral-200 dark:border-neutral-800">
              <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                <h1 className="text-xl font-bold">X Manager</h1>
                {state.user && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-neutral-500">
                      @{state.user.screenName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        resetWarningDismissed();
                        alert('보안 경고 메시지가 다시 표시됩니다.');
                      }}
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-xs"
                    >
                      보안 경고 보기
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'LOGOUT' })}
                      className="text-red-500 hover:text-red-600"
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            </header>

            {/* 제품 설명 */}
            {!isAuthenticated && (
              <div className="max-w-4xl mx-auto px-6 pt-6">
                <div className="text-center mb-6">
                  <p className="text-neutral-600 dark:text-neutral-400">
                    오래된 트윗을 한 번에 정리하세요. 보존할 트윗을 필터로
                    선택하고, 나머지를 일괄 삭제합니다.
                  </p>
                </div>
              </div>
            )}

            {/* 메인 콘텐츠 */}
            <div className="max-w-4xl mx-auto px-6 py-6">
              {!isAuthenticated ? <AuthForm /> : <TweetManager />}
            </div>
          </div>
        </AppDispatchContext.Provider>
      </AppStateContext.Provider>
    </QueryClientProvider>
  );
}
