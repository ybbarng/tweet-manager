'use client';

import { RefreshCw, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { getDeletionCandidates } from '@/lib/filters/engine';
import { createLikesFilter } from '@/lib/filters/likes';
import { createRetweetsFilter } from '@/lib/filters/retweets';
import { createThreadFilter } from '@/lib/filters/thread';
import { fetchTweets, isElectron, onDeleteProgress } from '@/lib/ipc';
import { useDeleteBatch, useParseArchive, useSaveBackup } from '@/lib/queries';
import { useAppDispatch, useAppState } from '@/lib/store/tweet-store';
import type { DeletionProgress as DeletionProgressType, Tweet } from '@/types';
import QueryBuilder from '../filters/QueryBuilder';
import TweetList from '../tweets/TweetList';
import TweetStats from '../tweets/TweetStats';

export default function TweetManager() {
  const { user, tweets, deletionProgress } = useAppState();
  const dispatch = useAppDispatch();

  // 데이터 로드 상태
  const [apiLoading, setApiLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [showAdvancedUpload, setShowAdvancedUpload] = useState(false);
  const archiveMutation = useParseArchive();

  // 필터 상태 (삭제 조건)
  const [likesEnabled, setLikesEnabled] = useState(false);
  const [minLikes, setMinLikes] = useState(5);
  const [retweetsEnabled, setRetweetsEnabled] = useState(false);
  const [minRetweets, setMinRetweets] = useState(3);
  const [threadEnabled, setThreadEnabled] = useState(false);
  const [excludedThreadIds, setExcludedThreadIds] = useState<string[]>([]);

  // 표시 제한
  const [displayLimit, setDisplayLimit] = useState<number | null>(100);

  // 사용자가 체크한 트윗 ID (삭제 선택)
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(
    new Set(),
  );

  // 삭제 상태
  const [confirmed, setConfirmed] = useState(false);
  const deleteMutation = useDeleteBatch();
  const backupMutation = useSaveBackup();

  // 필터 계산 (내부적으로는 "보존" 로직 사용)
  const filters = useMemo(() => {
    const f = [];
    if (likesEnabled) f.push(createLikesFilter(minLikes));
    if (retweetsEnabled) f.push(createRetweetsFilter(minRetweets));
    if (threadEnabled && excludedThreadIds.length > 0)
      f.push(createThreadFilter(excludedThreadIds));
    return f;
  }, [
    likesEnabled,
    minLikes,
    retweetsEnabled,
    minRetweets,
    threadEnabled,
    excludedThreadIds,
  ]);

  // 조건이 활성화되어 있는지 확인
  const hasActiveConditions = likesEnabled || retweetsEnabled;

  // 삭제 후보 (쿼리 결과)
  const deletionCandidates = useMemo(
    () => getDeletionCandidates(tweets, filters),
    [tweets, filters],
  );

  // 표시할 트윗 (limit 적용)
  const displayedTweets = useMemo(() => {
    if (displayLimit) {
      return deletionCandidates.slice(0, displayLimit);
    }
    return deletionCandidates;
  }, [deletionCandidates, displayLimit]);

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
  const handleApiLoad = async () => {
    if (!isElectron()) return;
    setApiLoading(true);
    setLoadError('');
    setLoadingMessage('트윗을 불러오고 있습니다...');

    // 삭제 진행 상태 초기화
    dispatch({
      type: 'SET_DELETION_PROGRESS',
      payload: { total: 0, completed: 0, failed: 0, status: 'idle' },
    });

    try {
      const allTweets: Tweet[] = [];
      let cursor: string | undefined;

      while (true) {
        const result = await fetchTweets(cursor);
        if (!result.success || !result.data) {
          if (allTweets.length === 0) {
            setLoadError(result.error || '트윗 조회에 실패했습니다.');
          }
          break;
        }

        const loadedTweets = result.data.tweets.map((t: Tweet) => ({
          ...t,
          createdAt: new Date(t.createdAt),
        }));
        allTweets.push(...loadedTweets);
        setLoadingMessage(
          `트윗을 불러오고 있습니다... (${allTweets.length}개)`,
        );

        cursor = result.data.nextCursor;
        if (!cursor || loadedTweets.length === 0) break;
      }

      if (allTweets.length > 0) {
        dispatch({ type: 'SET_TWEETS', payload: allTweets });
      }
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setApiLoading(false);
      setLoadingMessage('');
    }
  };

  const handleArchiveUpload = () => {
    if (!isElectron()) return;
    setLoadError('');
    setLoadingMessage('아카이브 파일을 파싱하고 있습니다...');

    // 삭제 진행 상태 초기화
    dispatch({
      type: 'SET_DELETION_PROGRESS',
      payload: { total: 0, completed: 0, failed: 0, status: 'idle' },
    });

    archiveMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.success && result.data) {
          const loadedTweets = result.data.map((t: Tweet) => ({
            ...t,
            createdAt: new Date(t.createdAt),
          }));
          dispatch({ type: 'SET_TWEETS', payload: loadedTweets });
        } else {
          setLoadError(result.error || '아카이브 파싱에 실패했습니다.');
        }
        setLoadingMessage('');
      },
      onError: (err) => {
        setLoadError(err.message);
        setLoadingMessage('');
      },
    });
  };

  // 트윗 선택/해제 토글
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

  // 전체 선택
  const handleSelectAll = useCallback(() => {
    setSelectedForDeletion(new Set(displayedTweets.map((t) => t.id)));
  }, [displayedTweets]);

  // 전체 해제
  const handleDeselectAll = useCallback(() => {
    setSelectedForDeletion(new Set());
  }, []);

  const handleBackup = () => {
    if (!isElectron()) return;
    backupMutation.mutate(toDelete);
  };

  const handleDelete = () => {
    if (!isElectron() || !confirmed) return;

    dispatch({
      type: 'SET_DELETION_PROGRESS',
      payload: {
        total: toDelete.length,
        completed: 0,
        failed: 0,
        status: 'running',
      },
    });

    const tweetIds = toDelete.map((t) => t.id);
    deleteMutation.mutate(tweetIds, {
      onSuccess: () => {
        dispatch({
          type: 'SET_DELETION_PROGRESS',
          payload: { status: 'done' },
        });
        dispatch({ type: 'REMOVE_DELETED_TWEETS', payload: tweetIds });
        setConfirmed(false);
        setSelectedForDeletion(new Set());
      },
    });
  };

  useEffect(() => {
    if (!isElectron()) return;
    const unsubscribe = onDeleteProgress((progress: DeletionProgressType) => {
      dispatch({ type: 'SET_DELETION_PROGRESS', payload: progress });
    });
    return unsubscribe;
  }, [dispatch]);

  const loading = archiveMutation.isPending || apiLoading;
  const isRunning = deletionProgress.status === 'running';
  const isDone = deletionProgress.status === 'done';
  const progress =
    deletionProgress.total > 0
      ? Math.round((deletionProgress.completed / deletionProgress.total) * 100)
      : 0;

  // 트윗이 없으면 데이터 로드 화면
  if (tweets.length === 0 && !loading) {
    return (
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-2">트윗 불러오기</h2>
        {user && (
          <p className="text-neutral-500 mb-6">
            @{user.screenName} 계정의 트윗을 불러옵니다.
          </p>
        )}

        <button
          type="button"
          onClick={handleApiLoad}
          disabled={loading}
          className="w-full flex items-center gap-3 p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors disabled:opacity-50"
        >
          <RefreshCw className="w-8 h-8 text-green-500" />
          <div className="text-left">
            <p className="font-semibold">API로 가져오기</p>
            <p className="text-sm text-neutral-500">
              Twitter API를 통해 트윗을 가져옵니다
            </p>
          </div>
        </button>

        {/* 고급 옵션: 아카이브 업로드 */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAdvancedUpload(!showAdvancedUpload)}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showAdvancedUpload ? 'rotate-90' : ''}`}
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
            고급 옵션
          </button>

          {showAdvancedUpload && (
            <button
              type="button"
              onClick={handleArchiveUpload}
              disabled={loading}
              className="mt-3 w-full flex items-center gap-3 p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors disabled:opacity-50"
            >
              <Upload className="w-8 h-8 text-blue-500" />
              <div className="text-left">
                <p className="font-semibold">아카이브 파일 업로드</p>
                <p className="text-sm text-neutral-500">
                  X 설정에서 다운로드한 아카이브의 tweets.js 파일
                </p>
              </div>
            </button>
          )}
        </div>

        {loadingMessage && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {loadingMessage}
            </p>
          </div>
        )}

        {loadError && <p className="mt-4 text-red-500 text-sm">{loadError}</p>}
      </div>
    );
  }

  // 로딩 중
  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="p-6 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 text-blue-500 animate-spin" />
          <p className="text-blue-600 dark:text-blue-400">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  // 메인 관리 화면
  return (
    <div className="max-w-4xl mx-auto">
      {/* 데이터 상태 바 */}
      <div className="flex items-center justify-between mb-6 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        <div>
          <span className="font-semibold">
            {tweets.length.toLocaleString()}
          </span>
          <span className="text-neutral-500">개의 트윗</span>
          {user && (
            <span className="text-neutral-400 ml-2">@{user.screenName}</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleApiLoad}
          disabled={loading || isRunning}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-600 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
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
            <p className="text-sm text-neutral-500 mb-4">
              조건에 맞는 트윗을 삭제 후보로 선정합니다
            </p>

            <QueryBuilder
              likesEnabled={likesEnabled}
              minLikes={minLikes}
              retweetsEnabled={retweetsEnabled}
              minRetweets={minRetweets}
              threadEnabled={threadEnabled}
              excludedThreadIds={excludedThreadIds}
              limit={displayLimit}
              onLikesEnabledChange={setLikesEnabled}
              onMinLikesChange={setMinLikes}
              onRetweetsEnabledChange={setRetweetsEnabled}
              onMinRetweetsChange={setMinRetweets}
              onThreadEnabledChange={setThreadEnabled}
              onExcludedThreadIdsChange={setExcludedThreadIds}
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
                  {hasActiveConditions
                    ? `삭제 후보 (${displayedTweets.length.toLocaleString()}개${displayLimit && deletionCandidates.length > displayLimit ? ` / 전체 ${deletionCandidates.length.toLocaleString()}개` : ''})`
                    : '조건을 선택하세요'}
                </h4>
                {selectedForDeletion.size > 0 && (
                  <span className="text-xs text-neutral-500">
                    {selectedForDeletion.size}개 선택됨
                  </span>
                )}
              </div>
              {hasActiveConditions && displayedTweets.length > 0 && (
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

            <p className="text-xs text-neutral-500 mb-2">
              {hasActiveConditions
                ? '삭제할 트윗을 체크하세요. 체크한 트윗만 삭제됩니다.'
                : '왼쪽 패널에서 삭제 조건을 설정하세요.'}
            </p>

            {hasActiveConditions ? (
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
                  것에 동의합니다
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
