'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useReducer, useState } from 'react';
import AuthForm, { resetWarningDismissed } from '@/components/auth/AuthForm';
import SecurityWarningModal from '@/components/auth/SecurityWarningModal';
import TweetManager from '@/components/manager/TweetManager';
import { getQueryClient } from '@/lib/query-client';
import {
  AppDispatchContext,
  AppStateContext,
  initialState,
  reducer,
} from '@/lib/store/tweet-store';

const taglines = [
  '흑역사, 깔끔하게 정리하세요.',
  '과거의 트윗, 새 출발의 시작.',
  '트윗 정리, 클릭 몇 번이면 끝.',
  '디지털 발자국, 내 손으로 관리하세요.',
  '타임라인을 가볍게, 마음도 가볍게.',
  '묵혀둔 트윗, 이제 보내줄 시간.',
  '깨끗한 타임라인, 새로운 시작.',
];

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showWarning, setShowWarning] = useState(false);
  const [taglineIndex, setTaglineIndex] = useState(0);

  const isAuthenticated = !!state.auth;

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % taglines.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleShowWarning = () => {
    resetWarningDismissed();
    setShowWarning(true);
  };

  return (
    <QueryClientProvider client={getQueryClient()}>
      <AppStateContext.Provider value={state}>
        <AppDispatchContext.Provider value={dispatch}>
          <div className="min-h-screen bg-background text-foreground">
            {/* 헤더 */}
            <header className="border-b border-neutral-200 dark:border-neutral-800">
              <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/icon.svg" alt="Tweet Eraser" className="w-8 h-8" />
                  <h1 className="text-xl font-bold">Tweet Eraser</h1>
                </div>
                {state.user && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-neutral-500">
                      @{state.user.screenName}
                    </span>
                    <button
                      type="button"
                      onClick={handleShowWarning}
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
              <div className="max-w-lg mx-auto pt-6">
                <p className="text-neutral-600 dark:text-neutral-400 mb-6 transition-opacity duration-500">
                  {taglines[taglineIndex]}
                </p>
              </div>
            )}

            {/* 메인 콘텐츠 */}
            <div className="max-w-4xl mx-auto px-6 py-6">
              {!isAuthenticated ? <AuthForm /> : <TweetManager />}
            </div>
          </div>

          {/* 보안 경고 모달 */}
          <SecurityWarningModal
            open={showWarning}
            onClose={() => setShowWarning(false)}
          />
        </AppDispatchContext.Provider>
      </AppStateContext.Provider>
    </QueryClientProvider>
  );
}
