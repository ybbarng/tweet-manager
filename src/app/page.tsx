'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { useEffect, useState } from 'react';
import AuthForm, { resetWarningDismissed } from '@/components/auth/AuthForm';
import SecurityWarningModal from '@/components/auth/SecurityWarningModal';
import DeletionHistoryModal from '@/components/history/DeletionHistoryModal';
import TweetManager from '@/components/manager/TweetManager';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { onUpdateAvailable } from '@/lib/ipc';
import { getQueryClient } from '@/lib/query-client';
import { useAppStore } from '@/lib/store/app-store';
import { getRandomTaglineIndex, taglines } from '@/lib/taglines';

export default function Home() {
  const { auth, user, logout } = useAppStore();
  const [showWarning, setShowWarning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  const isAuthenticated = !!auth;

  // 클라이언트에서만 랜덤 인덱스 설정 (hydration 불일치 방지)
  useEffect(() => {
    setTaglineIndex(getRandomTaglineIndex());
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % taglines.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // 업데이트 가능 알림 구독
  useEffect(() => {
    const unsubscribe = onUpdateAvailable((version) => {
      setNewVersion(version);
    });
    return unsubscribe;
  }, []);

  const handleShowWarning = () => {
    resetWarningDismissed();
    setShowWarning(true);
  };

  return (
    <QueryClientProvider client={getQueryClient()}>
      <div className="min-h-screen bg-background text-foreground">
        {/* 헤더 */}
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {/* biome-ignore lint/performance/noImgElement: Electron 앱에서 next/image 불필요 */}
                <img src="/icon.svg" alt="Tweet Eraser" className="w-8 h-8" />
                <h1 className="text-xl font-bold">Tweet Eraser</h1>
              </div>
              <ThemeToggle />
            </div>
            {user && (
              <div className="flex items-center gap-3 text-sm">
                <a
                  href={`https://x.com/${user.screenName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:underline"
                >
                  @{user.screenName}
                </a>
                <button
                  type="button"
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  title="삭제 히스토리"
                >
                  <History className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleShowWarning}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-xs"
                >
                  보안 경고 보기
                </button>
                <button
                  type="button"
                  onClick={logout}
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

      {/* 삭제 히스토리 모달 */}
      <DeletionHistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
      />

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-2 text-center text-xs text-neutral-400">
        <a
          href={
            newVersion
              ? `https://github.com/ybbarng/tweet-manager/releases/tag/v${newVersion}`
              : `https://github.com/ybbarng/tweet-manager/releases/tag/v${process.env.APP_VERSION}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          v{process.env.APP_VERSION}
          {newVersion && (
            <span className="ml-2 text-orange-500">
              (새 버전 {newVersion} 있음)
            </span>
          )}
        </a>
      </footer>
    </QueryClientProvider>
  );
}
