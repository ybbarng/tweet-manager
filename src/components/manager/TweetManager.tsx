'use client';

import { LogOut, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import TweetList from '../tweets/TweetList';
import TweetStats from '../tweets/TweetStats';

export default function TweetManager() {
  // Zustand 스토어에서 상태와 액션 가져오기
  const {
    user,
    tweets,
    deletionProgress,
    filterState,
    setTweets,
    appendTweets,
    removeTweets,
    setDeletionProgress,
    resetDeletionProgress,
    logout,
    // Filter actions
    setCombineMode,
    setLikesEnabled,
    setLikesOperator,
    setLikesValue,
    setRetweetsEnabled,
    setRetweetsOperator,
    setRetweetsValue,
    setViewsEnabled,
    setViewsOperator,
    setViewsValue,
    setKeywordEnabled,
    setKeywords,
    setKeywordMatchMode,
    setKeywordNegate,
    setHasPhotoEnabled,
    setHasPhotoValue,
    setHasVideoEnabled,
    setHasVideoValue,
    setReplyEnabled,
    setReplyValue,
    setThreadEnabled,
    setThreadExcludedIds,
    setStartDateEnabled,
    setStartDate,
    setEndDateEnabled,
    setEndDate,
    setDisplayLimit,
    // Derived
    getDeletionCandidates,
    hasActiveConditions,
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

  // 삭제 후보 (스토어의 derived state)
  const deletionCandidates = useMemo(
    () => getDeletionCandidates(),
    [getDeletionCandidates],
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

  // 데이터 로드 함수들
  const handleApiLoad = async (cursor?: string) => {
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
  };

  const handleLoadMore = () => {
    if (apiLoading || !nextCursor || !hasMore) return;
    handleApiLoad(nextCursor);
  };

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

  const handleBackup = () => {
    if (!isElectron()) return;
    backupMutation.mutate(toDelete);
  };

  const handleDelete = async () => {
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
  };

  useEffect(() => {
    if (!isElectron()) return;
    const unsubscribe = onDeleteProgress((progress: DeletionProgressType) => {
      setDeletionProgress(progress);
    });
    return unsubscribe;
  }, [setDeletionProgress]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 의도적으로 마운트 시에만 실행
  useEffect(() => {
    if (tweets.length === 0 && !apiLoading) {
      handleApiLoad(undefined);
    }
  }, []);

  const handleLogout = async () => {
    await clearAuth();
    logout();
  };

  const loading = apiLoading;
  const isRunning = deletionProgress.status === 'running';
  const isDone = deletionProgress.status === 'done';
  const activeConditions = hasActiveConditions();

  const dateRange = useMemo(() => {
    if (tweets.length === 0) return null;
    const dates = tweets.map((t) => t.createdAt.getTime());
    const oldest = new Date(Math.min(...dates));
    const newest = new Date(Math.max(...dates));
    const formatDate = (d: Date) =>
      d.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    return { oldest: formatDate(oldest), newest: formatDate(newest) };
  }, [tweets]);
  const progress =
    deletionProgress.total > 0
      ? Math.round((deletionProgress.completed / deletionProgress.total) * 100)
      : 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* 데이터 상태 바 */}
      <div className="flex items-center justify-between mb-6 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
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
              onClick={handleLoadMore}
              disabled={loading || isRunning}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-400 text-white rounded-lg"
            >
              더 불러오기
            </button>
          )}
          <button
            type="button"
            onClick={() => handleApiLoad(undefined)}
            disabled={loading || isRunning}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading || isRunning}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 disabled:opacity-50"
            title="로그아웃"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 삭제 진행/완료 상태 */}
      {isDone && (
        <div className="p-6 bg-green-50 dark:bg-green-950 rounded-lg text-center mb-6">
          <p className="text-lg font-bold text-green-600">삭제 완료</p>
          <p className="text-sm text-green-500 mt-1">
            {deletionProgress.completed}개 삭제 완료
            {deletionProgress.failed > 0 &&
              ` / ${deletionProgress.failed}개 실패`}
          </p>
        </div>
      )}

      {/* 중단됨 상태 */}
      {deletionProgress.status === 'stopped' && (
        <div className="p-6 bg-amber-50 dark:bg-amber-950 rounded-lg mb-6">
          <p className="text-lg font-bold text-amber-600">삭제 중단됨</p>
          <p className="text-sm text-amber-500 mt-1">
            {deletionProgress.completed}개 삭제 완료 / {deletionProgress.failed}
            개 실패
          </p>
          {deletionProgress.stopReason && (
            <p className="text-sm text-amber-600 mt-2">
              {deletionProgress.stopReason}
            </p>
          )}
          {deletionProgress.failedTweetIds &&
            deletionProgress.failedTweetIds.length > 0 && (
              <div className="mt-4 text-left">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">
                  실패한 트윗:
                </p>
                <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {deletionProgress.failedTweetIds.map((f) => (
                    <li key={f.id} className="text-amber-600">
                      • ID: {f.id} - {f.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}

      {isRunning && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span>삭제 중...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3">
            <div
              className="bg-red-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            {deletionProgress.completed} / {deletionProgress.total} 완료
            {deletionProgress.failed > 0 &&
              ` (${deletionProgress.failed}개 실패)`}
          </p>
        </div>
      )}

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

            <QueryBuilder
              tweets={tweets}
              combineMode={filterState.combineMode}
              onCombineModeChange={setCombineMode}
              likesEnabled={filterState.likes.enabled}
              likesOperator={filterState.likes.operator}
              minLikes={filterState.likes.value}
              onLikesEnabledChange={setLikesEnabled}
              onLikesOperatorChange={setLikesOperator}
              onMinLikesChange={setLikesValue}
              retweetsEnabled={filterState.retweets.enabled}
              retweetsOperator={filterState.retweets.operator}
              minRetweets={filterState.retweets.value}
              onRetweetsEnabledChange={setRetweetsEnabled}
              onRetweetsOperatorChange={setRetweetsOperator}
              onMinRetweetsChange={setRetweetsValue}
              viewsEnabled={filterState.views.enabled}
              viewsOperator={filterState.views.operator}
              minViews={filterState.views.value}
              onViewsEnabledChange={setViewsEnabled}
              onViewsOperatorChange={setViewsOperator}
              onMinViewsChange={setViewsValue}
              keywordEnabled={filterState.keyword.enabled}
              keywords={filterState.keyword.keywords}
              keywordMatchMode={filterState.keyword.matchMode}
              keywordNegate={filterState.keyword.negate}
              onKeywordEnabledChange={setKeywordEnabled}
              onKeywordsChange={setKeywords}
              onKeywordMatchModeChange={setKeywordMatchMode}
              onKeywordNegateChange={setKeywordNegate}
              hasPhotoEnabled={filterState.hasPhoto.enabled}
              hasPhotoValue={filterState.hasPhoto.value}
              onHasPhotoEnabledChange={setHasPhotoEnabled}
              onHasPhotoValueChange={setHasPhotoValue}
              hasVideoEnabled={filterState.hasVideo.enabled}
              hasVideoValue={filterState.hasVideo.value}
              onHasVideoEnabledChange={setHasVideoEnabled}
              onHasVideoValueChange={setHasVideoValue}
              replyEnabled={filterState.reply.enabled}
              replyIsReply={filterState.reply.value}
              onReplyEnabledChange={setReplyEnabled}
              onReplyIsReplyChange={setReplyValue}
              threadEnabled={filterState.thread.enabled}
              excludedThreadIds={filterState.thread.excludedIds}
              onThreadEnabledChange={setThreadEnabled}
              onExcludedThreadIdsChange={setThreadExcludedIds}
              startDateEnabled={filterState.startDate.enabled}
              startDate={filterState.startDate.date}
              onStartDateEnabledChange={setStartDateEnabled}
              onStartDateChange={setStartDate}
              endDateEnabled={filterState.endDate.enabled}
              endDate={filterState.endDate.date}
              onEndDateEnabledChange={setEndDateEnabled}
              onEndDateChange={setEndDate}
              limit={filterState.displayLimit}
              onLimitChange={setDisplayLimit}
              resultCount={deletionCandidates.length}
            />
          </div>

          {/* 오른쪽: 트윗 목록 + 삭제 */}
          <div className="lg:col-span-2">
            <TweetStats
              total={tweets.length}
              toDelete={toDelete.length}
              preserved={tweets.length - toDelete.length}
            />

            {/* 헤더 및 전체 선택/해제 버튼 */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-sm text-red-500">
                  {activeConditions
                    ? `삭제 후보 (${displayedTweets.length.toLocaleString()}개${filterState.displayLimit && deletionCandidates.length > filterState.displayLimit ? ` / 전체 ${deletionCandidates.length.toLocaleString()}개` : ''})`
                    : '조건을 선택하세요'}
                </h4>
                {selectedForDeletion.size > 0 && (
                  <span className="text-xs text-neutral-500">
                    {selectedForDeletion.size}개 선택됨
                  </span>
                )}
              </div>
              {activeConditions && displayedTweets.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={
                      selectedForDeletion.size === displayedTweets.length
                    }
                  >
                    전체 선택
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAll}
                    disabled={selectedForDeletion.size === 0}
                  >
                    전체 해제
                  </Button>
                </div>
              )}
            </div>

            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">
              {activeConditions
                ? '삭제할 트윗을 체크하세요. 체크한 트윗만 삭제됩니다.'
                : '왼쪽 패널에서 삭제 조건을 설정하세요.'}
            </p>

            {activeConditions ? (
              <TweetList
                tweets={displayedTweets}
                showCheckbox
                checkedIds={selectedForDeletion}
                onToggle={handleToggleSelection}
                invertChecked
              />
            ) : (
              <div className="h-[500px] flex items-center justify-center border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900">
                <p className="text-neutral-500">
                  삭제 조건을 선택하면 트윗이 표시됩니다
                </p>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={handleBackup}
                disabled={backupMutation.isPending || toDelete.length === 0}
                className="w-full py-2 px-4 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {backupMutation.isPending
                  ? '저장 중...'
                  : '선택한 트윗 백업 다운로드 (JSON)'}
              </button>

              {/* 삭제 전 백업 옵션 */}
              <div className="flex items-center gap-2 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                <Checkbox
                  id="backup-before-delete"
                  checked={backupBeforeDelete}
                  onCheckedChange={(checked) =>
                    setBackupBeforeDelete(checked === true)
                  }
                  disabled={toDelete.length === 0}
                />
                <label
                  htmlFor="backup-before-delete"
                  className="text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer"
                >
                  삭제 전 백업 저장 (권장)
                </label>
              </div>

              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <Checkbox
                  id="confirm-delete"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked === true)}
                  disabled={toDelete.length === 0}
                  className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                />
                <label
                  htmlFor="confirm-delete"
                  className="text-sm text-red-600 cursor-pointer"
                >
                  {toDelete.length.toLocaleString()}개의 트윗을 영구 삭제하는
                  것에 동의합니다.
                </label>
              </div>

              <button
                type="button"
                onClick={handleDelete}
                disabled={!confirmed || toDelete.length === 0}
                className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-neutral-400 text-white rounded-lg font-medium transition-colors"
              >
                {toDelete.length.toLocaleString()}개 트윗 삭제 실행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
