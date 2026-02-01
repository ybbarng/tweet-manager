'use client';

import { Bug, LogOut, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { exportDebugData } from '@/lib/ipc';
import { useAppStore } from '@/lib/store/app-store';
import { formatDate } from '@/lib/utils/date';

interface TweetStatusBarProps {
  loading: boolean;
  loadError: string;
  hasMore: boolean;
  isRunning: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}

export default function TweetStatusBar({
  loading,
  loadError,
  hasMore,
  isRunning,
  onLoadMore,
  onRefresh,
  onLogout,
}: TweetStatusBarProps) {
  const { user, tweets } = useAppStore();
  const [debugExporting, setDebugExporting] = useState(false);
  const [debugMessage, setDebugMessage] = useState('');

  const handleExportDebug = async () => {
    setDebugExporting(true);
    setDebugMessage('');
    try {
      const result = await exportDebugData();
      if (result.success && result.data) {
        setDebugMessage(`${result.data.responseCount}개 응답 저장 완료`);
        setTimeout(() => setDebugMessage(''), 3000);
      } else {
        setDebugMessage(result.error || '내보내기 실패');
        setTimeout(() => setDebugMessage(''), 3000);
      }
    } catch {
      setDebugMessage('내보내기 실패');
      setTimeout(() => setDebugMessage(''), 3000);
    } finally {
      setDebugExporting(false);
    }
  };

  const dateRange = useMemo(() => {
    if (tweets.length === 0) return null;
    const dates = tweets.map((t) => t.createdAt.getTime());
    const oldest = new Date(Math.min(...dates));
    const newest = new Date(Math.max(...dates));
    return { oldest: formatDate(oldest), newest: formatDate(newest) };
  }, [tweets]);

  return (
    <div className="relative flex items-center justify-between mb-6 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {loading && (
            <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
          )}
          <span className="font-semibold">
            {tweets.length.toLocaleString()}
          </span>
          <span className="text-neutral-500">개의 트윗</span>
          {user && (
            <span className="text-neutral-400 ml-2">@{user.screenName}</span>
          )}
          {loading && (
            <span className="text-blue-500 text-sm">불러오는 중...</span>
          )}
          {loadError && (
            <span className="text-red-500 text-sm">{loadError}</span>
          )}
        </div>
        {dateRange && (
          <div className="text-xs text-neutral-500">
            {dateRange.oldest} ~ {dateRange.newest}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {hasMore && !loading && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading || isRunning}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-400 text-white rounded-lg"
          >
            더 불러오기
          </button>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || isRunning}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-600 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
        <button
          type="button"
          onClick={handleExportDebug}
          disabled={debugExporting || loading || isRunning}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 disabled:opacity-50"
          title="API 응답 디버그 내보내기"
        >
          <Bug className={`w-4 h-4 ${debugExporting ? 'animate-pulse' : ''}`} />
        </button>
        <button
          type="button"
          onClick={onLogout}
          disabled={loading || isRunning}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 disabled:opacity-50"
          title="로그아웃"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
      {debugMessage && (
        <div className="absolute right-4 top-full mt-1 text-xs text-neutral-500 bg-white dark:bg-neutral-800 px-2 py-1 rounded shadow">
          {debugMessage}
        </div>
      )}
    </div>
  );
}
