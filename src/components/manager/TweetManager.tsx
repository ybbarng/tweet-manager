'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createFiltersFromState,
  hasActiveConditions,
} from '@/lib/filters/create-filters';
import { getDeletionCandidates } from '@/lib/filters/engine';
import {
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
import TweetStatusBar, { type BulkLoadSettings } from './TweetStatusBar';

export default function TweetManager() {
  const {
    tweets,
    user,
    deletionProgress,
    filterState,
    setTweets,
    appendTweets,
    removeTweets,
    updateUser,
    setDeletionProgress,
    resetDeletionProgress,
  } = useAppStore();

  // 데이터 로드 상태
  const [apiLoading, setApiLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const lastFetchTime = useRef(0);
  const pageCountRef = useRef(0); // 디버그용 페이지 카운터
  const MIN_FETCH_INTERVAL = 500;

  // 연속 불러오기 상태
  const [bulkLoadProgress, setBulkLoadProgress] = useState<{
    current: number;
    targetDate?: string;
  } | null>(null);
  const bulkLoadAbortRef = useRef(false);

  // 가장 오래된 트윗의 날짜
  const oldestTweetDate = useMemo(() => {
    if (tweets.length === 0) return null;
    const dates = tweets.map((t) => t.createdAt.getTime());
    return new Date(Math.min(...dates));
  }, [tweets]);

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
    async (cursor?: string, count?: number) => {
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
        pageCountRef.current = 0;
        resetDeletionProgress();
      }

      pageCountRef.current += 1;
      const currentPage = pageCountRef.current;

      try {
        const result = await fetchTweets(cursor, currentPage, count);
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

        // 트윗에서 사용자 정보 업데이트 (screenName이 비어있을 때)
        if (result.data.user?.screenName && !user?.screenName) {
          updateUser(result.data.user);
        }

        setNextCursor(result.data.nextCursor);
        setHasMore(!!result.data.nextCursor && loadedTweets.length > 0);
      } catch (err) {
        setLoadError((err as Error).message);
      } finally {
        setApiLoading(false);
      }
    },
    [
      apiLoading,
      appendTweets,
      resetDeletionProgress,
      setTweets,
      user,
      updateUser,
    ],
  );

  const handleLoadMore = useCallback(() => {
    if (apiLoading || !nextCursor || !hasMore) return;
    handleApiLoad(nextCursor);
  }, [apiLoading, nextCursor, hasMore, handleApiLoad]);

  // 연속 불러오기 (startDate까지 자동 로드)
  const handleBulkLoad = useCallback(
    async (settings: BulkLoadSettings) => {
      const startDate = filterState.startDate.date;
      if (!isElectron() || apiLoading || !hasMore || !startDate) return;

      // startDate의 0시 (시작 시간)
      const targetDate = new Date(startDate);
      targetDate.setHours(0, 0, 0, 0);
      const targetDateStr = targetDate.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      bulkLoadAbortRef.current = false;
      setBulkLoadProgress({ current: 0, targetDate: targetDateStr });

      let currentCursor = nextCursor;
      let iteration = 0;
      let reachedTarget = false;

      while (!bulkLoadAbortRef.current && currentCursor && !reachedTarget) {
        iteration++;
        setBulkLoadProgress({ current: iteration, targetDate: targetDateStr });

        // count 파라미터로 불러오기
        const result = await fetchTweets(
          currentCursor,
          pageCountRef.current + 1,
          settings.count,
        );
        if (!result.success || !result.data) {
          setLoadError(result.error || '트윗 조회에 실패했습니다.');
          break;
        }

        const loadedTweets = result.data.tweets.map((t: Tweet) => ({
          ...t,
          createdAt: new Date(t.createdAt),
        }));

        if (loadedTweets.length > 0) {
          appendTweets(loadedTweets);
          pageCountRef.current += 1;

          // 가장 오래된 트윗이 targetDate에 도달했는지 확인
          const oldestLoaded = new Date(
            Math.min(...loadedTweets.map((t: Tweet) => t.createdAt.getTime())),
          );
          if (oldestLoaded <= targetDate) {
            reachedTarget = true;
          }
        }

        currentCursor = result.data.nextCursor;
        setNextCursor(currentCursor);
        setHasMore(!!currentCursor && loadedTweets.length > 0);

        if (!currentCursor || loadedTweets.length === 0) break;

        // 다음 반복 전 간격만큼 대기
        if (!reachedTarget && !bulkLoadAbortRef.current) {
          await new Promise((resolve) =>
            setTimeout(resolve, settings.interval * 1000),
          );
        }
      }

      setBulkLoadProgress(null);
    },
    [apiLoading, hasMore, nextCursor, appendTweets, filterState.startDate.date],
  );

  const handleStopBulkLoad = useCallback(() => {
    bulkLoadAbortRef.current = true;
  }, []);

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
      <DeletionStatus />

      {!isRunning && !isDone && (
        <>
          {/* 삭제 조건 쿼리 빌더 */}
          <div className="mb-6">
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

          {/* 트윗 로드 상태 */}
          <TweetStatusBar
            loading={apiLoading}
            loadError={loadError}
            hasMore={hasMore}
            isRunning={isRunning}
            bulkLoadProgress={bulkLoadProgress ?? undefined}
            startDate={filterState.startDate.date}
            oldestTweetDate={oldestTweetDate}
            onLoadMore={handleLoadMore}
            onBulkLoad={handleBulkLoad}
            onStopBulkLoad={handleStopBulkLoad}
            onRefresh={() => handleApiLoad(undefined)}
          />

          {/* 트윗 통계 */}
          <TweetStats
            total={tweets.length}
            toDelete={toDelete.length}
            preserved={tweets.length - toDelete.length}
          />

          {/* 트윗 목록 */}
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

          {/* 삭제 액션 */}
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
        </>
      )}
    </div>
  );
}
