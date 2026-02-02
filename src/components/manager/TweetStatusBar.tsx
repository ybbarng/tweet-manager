'use client';

import { Bug, ChevronDown, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { exportDebugData } from '@/lib/ipc';
import { useAppStore } from '@/lib/store/app-store';
import { formatDate } from '@/lib/utils/date';

export interface BulkLoadSettings {
  count: number; // 한 번에 n개씩
  interval: number; // m초 간격
  repeat: number; // l회 반복
}

interface TweetStatusBarProps {
  loading: boolean;
  loadError: string;
  hasMore: boolean;
  isRunning: boolean;
  bulkLoadProgress?: { current: number; total: number };
  onLoadMore: () => void;
  onBulkLoad: (settings: BulkLoadSettings) => void;
  onStopBulkLoad: () => void;
  onRefresh: () => void;
}

export default function TweetStatusBar({
  loading,
  loadError,
  hasMore,
  isRunning,
  bulkLoadProgress,
  onLoadMore,
  onBulkLoad,
  onStopBulkLoad,
  onRefresh,
}: TweetStatusBarProps) {
  const { user, tweets } = useAppStore();
  const [debugExporting, setDebugExporting] = useState(false);
  const [debugMessage, setDebugMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // 고급 설정 값
  const [count, setCount] = useState(20);
  const [interval, setInterval] = useState(1);
  const [repeat, setRepeat] = useState(5);

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

  const handleBulkLoad = () => {
    setShowSettings(false);
    onBulkLoad({ count, interval, repeat });
  };

  const dateRange = useMemo(() => {
    if (tweets.length === 0) return null;
    const dates = tweets.map((t) => t.createdAt.getTime());
    const oldest = new Date(Math.min(...dates));
    const newest = new Date(Math.max(...dates));
    return { oldest: formatDate(oldest), newest: formatDate(newest) };
  }, [tweets]);

  const isBulkLoading = !!bulkLoadProgress;

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
          {loading && !isBulkLoading && (
            <span className="text-blue-500 text-sm">불러오는 중...</span>
          )}
          {isBulkLoading && (
            <span className="text-blue-500 text-sm">
              연속 불러오기 중... ({bulkLoadProgress.current}/
              {bulkLoadProgress.total})
            </span>
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
        {hasMore && !loading && !isBulkLoading && (
          <div className="relative">
            <div className="flex">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loading || isRunning}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-400 text-white rounded-l-lg"
              >
                더 불러오기
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                disabled={loading || isRunning}
                className="flex items-center px-2 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-400 text-white rounded-r-lg border-l border-blue-400"
                title="연속 불러오기 설정"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {showSettings && (
              <div className="absolute right-0 top-full mt-2 p-4 bg-white dark:bg-neutral-700 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-600 z-10 min-w-[280px]">
                <div className="text-sm font-medium mb-3">
                  연속 불러오기 설정
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-600 dark:text-neutral-300 w-24">
                      한 번에
                    </span>
                    <input
                      type="number"
                      value={count}
                      onChange={(e) =>
                        setCount(
                          Math.max(1, Math.min(100, Number(e.target.value))),
                        )
                      }
                      className="w-16 px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-500 rounded bg-white dark:bg-neutral-600"
                      min={1}
                      max={100}
                    />
                    <span className="text-sm text-neutral-500">개씩</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-600 dark:text-neutral-300 w-24">
                      간격
                    </span>
                    <input
                      type="number"
                      value={interval}
                      onChange={(e) =>
                        setInterval(
                          Math.max(0.5, Math.min(60, Number(e.target.value))),
                        )
                      }
                      className="w-16 px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-500 rounded bg-white dark:bg-neutral-600"
                      min={0.5}
                      max={60}
                      step={0.5}
                    />
                    <span className="text-sm text-neutral-500">초</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-600 dark:text-neutral-300 w-24">
                      반복
                    </span>
                    <input
                      type="number"
                      value={repeat}
                      onChange={(e) =>
                        setRepeat(
                          Math.max(1, Math.min(100, Number(e.target.value))),
                        )
                      }
                      className="w-16 px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-500 rounded bg-white dark:bg-neutral-600"
                      min={1}
                      max={100}
                    />
                    <span className="text-sm text-neutral-500">회</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={handleBulkLoad}
                    className="flex-1 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
                  >
                    시작
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="px-3 py-1.5 text-sm bg-neutral-200 dark:bg-neutral-600 hover:bg-neutral-300 dark:hover:bg-neutral-500 rounded"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {isBulkLoading && (
          <button
            type="button"
            onClick={onStopBulkLoad}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg"
          >
            중지
          </button>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || isRunning || isBulkLoading}
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
      </div>
      {debugMessage && (
        <div className="absolute right-4 top-full mt-1 text-xs text-neutral-500 bg-white dark:bg-neutral-800 px-2 py-1 rounded shadow">
          {debugMessage}
        </div>
      )}
    </div>
  );
}
