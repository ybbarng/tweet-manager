'use client';

import { RefreshCw, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTweetsToDelete } from '@/lib/filters/engine';
import { createLikesFilter } from '@/lib/filters/likes';
import { createRetweetsFilter } from '@/lib/filters/retweets';
import { createThreadFilter } from '@/lib/filters/thread';
import { fetchTweets, isElectron, onDeleteProgress } from '@/lib/ipc';
import { useDeleteBatch, useParseArchive, useSaveBackup } from '@/lib/queries';
import { useAppDispatch, useAppState } from '@/lib/store/tweet-store';
import type { DeletionProgress as DeletionProgressType, Tweet } from '@/types';
import LikesFilter from '../filters/LikesFilter';
import RetweetsFilter from '../filters/RetweetsFilter';
import ThreadFilter from '../filters/ThreadFilter';
import TweetList from '../tweets/TweetList';
import TweetStats from '../tweets/TweetStats';

export default function TweetManager() {
  const { user, tweets, excludedTweetIds, deletionProgress } = useAppState();
  const dispatch = useAppDispatch();

  // 데이터 로드 상태
  const [apiLoading, setApiLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [showAdvancedUpload, setShowAdvancedUpload] = useState(false);
  const archiveMutation = useParseArchive();

  // 필터 상태
  const [likesEnabled, setLikesEnabled] = useState(false);
  const [minLikes, setMinLikes] = useState(5);
  const [retweetsEnabled, setRetweetsEnabled] = useState(false);
  const [minRetweets, setMinRetweets] = useState(3);
  const [threadEnabled, setThreadEnabled] = useState(false);
  const [threadIds, setThreadIds] = useState<string[]>([]);

  // 삭제 상태
  const [confirmed, setConfirmed] = useState(false);
  const deleteMutation = useDeleteBatch();
  const backupMutation = useSaveBackup();

  // 필터 계산
  const filters = useMemo(() => {
    const f = [];
    if (likesEnabled) f.push(createLikesFilter(minLikes));
    if (retweetsEnabled) f.push(createRetweetsFilter(minRetweets));
    if (threadEnabled && threadIds.length > 0)
      f.push(createThreadFilter(threadIds));
    return f;
  }, [
    likesEnabled,
    minLikes,
    retweetsEnabled,
    minRetweets,
    threadEnabled,
    threadIds,
  ]);

  const toDelete = useMemo(
    () => getTweetsToDelete(tweets, filters, excludedTweetIds),
    [tweets, filters, excludedTweetIds],
  );

  // 데이터 로드 함수들
  const handleApiLoad = async () => {
    if (!isElectron()) return;
    setApiLoading(true);
    setLoadError('');
    setLoadingMessage('트윗을 불러오고 있습니다...');

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

  // 삭제 관련 함수들
  const handleToggleExclude = useCallback(
    (id: string) => {
      dispatch({ type: 'TOGGLE_EXCLUDE', payload: id });
    },
    [dispatch],
  );

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
          {/* 왼쪽: 필터 설정 */}
          <div className="lg:col-span-1">
            <h3 className="font-bold mb-4">필터 설정</h3>
            <p className="text-sm text-neutral-500 mb-4">
              조건에 맞는 트윗을 보존합니다
            </p>

            <div className="space-y-3">
              <LikesFilter
                minLikes={minLikes}
                onChange={setMinLikes}
                enabled={likesEnabled}
                onToggle={() => setLikesEnabled((v) => !v)}
              />
              <RetweetsFilter
                minRetweets={minRetweets}
                onChange={setMinRetweets}
                enabled={retweetsEnabled}
                onToggle={() => setRetweetsEnabled((v) => !v)}
              />
              <ThreadFilter
                preservedIds={threadIds}
                onChange={setThreadIds}
                enabled={threadEnabled}
                onToggle={() => setThreadEnabled((v) => !v)}
              />
            </div>

            {/* 제외 목록 표시 */}
            {excludedTweetIds.size > 0 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {excludedTweetIds.size}개 트윗을 수동으로 보존 처리했습니다
                </p>
                <button
                  type="button"
                  onClick={() => {
                    for (const id of excludedTweetIds) {
                      dispatch({ type: 'TOGGLE_EXCLUDE', payload: id });
                    }
                  }}
                  className="text-xs text-blue-500 hover:underline mt-1"
                >
                  모두 초기화
                </button>
              </div>
            )}
          </div>

          {/* 오른쪽: 트윗 목록 + 삭제 */}
          <div className="lg:col-span-2">
            <TweetStats
              total={tweets.length}
              toDelete={toDelete.length}
              preserved={tweets.length - toDelete.length}
            />

            {filters.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                하나 이상의 필터를 활성화하면
                <br />
                삭제 대상 트윗이 표시됩니다
              </div>
            ) : (
              <>
                <h4 className="font-medium text-sm text-red-500 mb-2">
                  삭제 대상 ({toDelete.length.toLocaleString()}개)
                </h4>
                <TweetList
                  tweets={toDelete}
                  showCheckbox
                  checkedIds={excludedTweetIds}
                  onToggle={handleToggleExclude}
                />

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={handleBackup}
                    disabled={backupMutation.isPending}
                    className="w-full py-2 px-4 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    {backupMutation.isPending
                      ? '저장 중...'
                      : '삭제 대상 백업 다운로드 (JSON)'}
                  </button>

                  <label className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-red-600">
                      {toDelete.length.toLocaleString()}개의 트윗을 영구
                      삭제하는 것에 동의합니다
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={!confirmed || toDelete.length === 0}
                    className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-neutral-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {toDelete.length.toLocaleString()}개 트윗 삭제 실행
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
