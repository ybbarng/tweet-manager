'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createFiltersFromState,
  hasActiveConditions,
} from '@/lib/filters/create-filters';
import { getDeletionCandidates } from '@/lib/filters/engine';
import {
  clearAuth,
  fetchTweets,
  isElectron,
  onDeleteProgress,
  saveHistory,
} from '@/lib/ipc';
import { useDeleteBatch, useSaveBackup } from '@/lib/queries';
import { useAppStore } from '@/lib/store/app-store';
import type { DeletionProgress as DeletionProgressType, Tweet } from '@/types';
import QueryBuilder from '../filters/QueryBuilder';
import TweetStats from '../tweets/TweetStats';
import DeleteActions from './DeleteActions';
import DeletionStatus from './DeletionStatus';
import TweetPreviewSection from './TweetPreviewSection';
import TweetStatusBar from './TweetStatusBar';

export default function TweetManager() {
  const {
    tweets,
    deletionProgress,
    filterState,
    setTweets,
    appendTweets,
    removeTweets,
    setDeletionProgress,
    resetDeletionProgress,
    logout,
  } = useAppStore();

  // 데이터 로드 상태
  const [apiLoading, setApiLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const lastFetchTime = useRef(0);
  const MIN_FETCH_INTERVAL = 500;

  // 사용자가 체크한 트윗 ID (삭제 선택)
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(
    new Set(),
  );

  // 삭제 상태
  const [confirmed, setConfirmed] = useState(false);
  const [backupBeforeDelete, setBackupBeforeDelete] = useState(true);
  const deleteMutation = useDeleteBatch();
  const backupMutation = useSaveBackup();

  // 필터 배열 생성
  const filters = useMemo(
    () => createFiltersFromState(filterState),
    [filterState],
  );

  // 활성화된 필터가 있는지 확인
  const activeConditions = useMemo(
    () => hasActiveConditions(filterState),
    [filterState],
  );

  // 삭제 후보
  const deletionCandidates = useMemo(
    () => getDeletionCandidates(tweets, filters, filterState.combineMode),
    [tweets, filters, filterState.combineMode],
  );

  // 표시할 트윗 (limit 적용)
  const displayedTweets = useMemo(() => {
    if (filterState.displayLimit) {
      return deletionCandidates.slice(0, filterState.displayLimit);
    }
    return deletionCandidates;
  }, [deletionCandidates, filterState.displayLimit]);

  // 실제 삭제 대상 = 사용자가 체크한 것만
  const toDelete = useMemo(
    () => displayedTweets.filter((t) => selectedForDeletion.has(t.id)),
    [displayedTweets, selectedForDeletion],
  );

  // 필터/표시 목록 변경 시 선택 초기화
  const displayedTweetsKey = displayedTweets.map((t) => t.id).join(',');
  // biome-ignore lint/correctness/useExhaustiveDependencies: 의도적으로 displayedTweetsKey 변경 시 선택 초기화
  useEffect(() => {
    setSelectedForDeletion(new Set());
  }, [displayedTweetsKey]);

  // 데이터 로드 함수
  const handleApiLoad = useCallback(
    async (cursor?: string) => {
      if (!isElectron()) return;
      if (apiLoading) return;

      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      if (timeSinceLastFetch < MIN_FETCH_INTERVAL) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_FETCH_INTERVAL - timeSinceLastFetch),
        );
      }
      lastFetchTime.current = Date.now();

      setApiLoading(true);
      setLoadError('');

      if (!cursor) {
        resetDeletionProgress();
      }

      try {
        const result = await fetchTweets(cursor);
        if (!result.success || !result.data) {
          setLoadError(result.error || '트윗 조회에 실패했습니다.');
          return;
        }

        const loadedTweets = result.data.tweets.map((t: Tweet) => ({
          ...t,
          createdAt: new Date(t.createdAt),
        }));

        if (loadedTweets.length > 0) {
          if (cursor) {
            appendTweets(loadedTweets);
          } else {
            setTweets(loadedTweets);
          }
        }

        setNextCursor(result.data.nextCursor);
        setHasMore(!!result.data.nextCursor && loadedTweets.length > 0);
      } catch (err) {
        setLoadError((err as Error).message);
      } finally {
        setApiLoading(false);
      }
    },
    [apiLoading, appendTweets, resetDeletionProgress, setTweets],
  );

  const handleLoadMore = useCallback(() => {
    if (apiLoading || !nextCursor || !hasMore) return;
    handleApiLoad(nextCursor);
  }, [apiLoading, nextCursor, hasMore, handleApiLoad]);

  const handleToggleSelection = useCallback((id: string) => {
    setSelectedForDeletion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedForDeletion(new Set(displayedTweets.map((t) => t.id)));
  }, [displayedTweets]);

  const handleDeselectAll = useCallback(() => {
    setSelectedForDeletion(new Set());
  }, []);

  const handleBackup = useCallback(() => {
    if (!isElectron()) return;
    backupMutation.mutate(toDelete);
  }, [backupMutation, toDelete]);

  const handleDelete = useCallback(async () => {
    if (!isElectron() || !confirmed) return;

    if (backupBeforeDelete) {
      try {
        await new Promise<void>((resolve, reject) => {
          backupMutation.mutate(toDelete, {
            onSuccess: () => resolve(),
            onError: (err) => reject(err),
          });
        });
      } catch {
        setLoadError('백업 저장에 실패했습니다. 삭제가 취소되었습니다.');
        return;
      }
    }

    setDeletionProgress({
      total: toDelete.length,
      completed: 0,
      failed: 0,
      status: 'running',
      failedTweetIds: [],
    });

    const tweetIds = toDelete.map((t) => t.id);
    deleteMutation.mutate(tweetIds, {
      onSuccess: async (result) => {
        const completedCount = result.data?.completed ?? tweetIds.length;
        const failedCount = result.data?.failed ?? 0;

        if (completedCount > 0 || failedCount > 0) {
          await saveHistory({
            id: crypto.randomUUID(),
            deletedAt: new Date().toISOString(),
            count: completedCount,
            failedCount,
          });
        }

        if (!result.success && result.data) {
          setDeletionProgress({
            status: 'stopped',
            stopReason: result.error,
            failedTweetIds: result.data.failedTweetIds,
          });
          const deletedIds = tweetIds.filter(
            (id) =>
              !result.data?.failedTweetIds?.some(
                (f: { id: string }) => f.id === id,
              ),
          );
          removeTweets(deletedIds);
        } else {
          setDeletionProgress({ status: 'done' });
          removeTweets(tweetIds);
        }
        setConfirmed(false);
        setSelectedForDeletion(new Set());
      },
    });
  }, [
    confirmed,
    backupBeforeDelete,
    backupMutation,
    toDelete,
    setDeletionProgress,
    deleteMutation,
    removeTweets,
  ]);

  const handleLogout = useCallback(async () => {
    await clearAuth();
    logout();
  }, [logout]);

  // 삭제 진행 상황 구독
  useEffect(() => {
    if (!isElectron()) return;
    const unsubscribe = onDeleteProgress((progress: DeletionProgressType) => {
      setDeletionProgress(progress);
    });
    return unsubscribe;
  }, [setDeletionProgress]);

  // 마운트 시 트윗 로드
  // biome-ignore lint/correctness/useExhaustiveDependencies: 의도적으로 마운트 시에만 실행
  useEffect(() => {
    if (tweets.length === 0 && !apiLoading) {
      handleApiLoad(undefined);
    }
  }, []);

  const isRunning = deletionProgress.status === 'running';
  const isDone = deletionProgress.status === 'done';

  return (
    <div className="max-w-4xl mx-auto">
      <TweetStatusBar
        loading={apiLoading}
        loadError={loadError}
        hasMore={hasMore}
        isRunning={isRunning}
        onLoadMore={handleLoadMore}
        onRefresh={() => handleApiLoad(undefined)}
        onLogout={handleLogout}
      />

      <DeletionStatus />

      {!isRunning && !isDone && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: SQL 스타일 쿼리 빌더 */}
          <div className="lg:col-span-1">
            <h3 className="font-bold mb-4">삭제 조건</h3>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4">
              조건에 맞는 트윗을{' '}
              <span className="font-semibold text-red-600 dark:text-red-400">
                삭제 후보
              </span>
              로 선정합니다.
            </p>

            <QueryBuilder resultCount={deletionCandidates.length} />
          </div>

          {/* 오른쪽: 트윗 목록 + 삭제 */}
          <div className="lg:col-span-2">
            <TweetStats
              total={tweets.length}
              toDelete={toDelete.length}
              preserved={tweets.length - toDelete.length}
            />

            <TweetPreviewSection
              activeConditions={activeConditions}
              displayedTweets={displayedTweets}
              deletionCandidatesCount={deletionCandidates.length}
              displayLimit={filterState.displayLimit}
              selectedForDeletion={selectedForDeletion}
              onToggleSelection={handleToggleSelection}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
            />

            <DeleteActions
              toDelete={toDelete}
              confirmed={confirmed}
              backupBeforeDelete={backupBeforeDelete}
              backupPending={backupMutation.isPending}
              onConfirmedChange={setConfirmed}
              onBackupBeforeDeleteChange={setBackupBeforeDelete}
              onBackup={handleBackup}
              onDelete={handleDelete}
            />
          </div>
        </div>
      )}
    </div>
  );
}
