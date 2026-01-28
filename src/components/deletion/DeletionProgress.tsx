'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppState, useAppDispatch } from '@/lib/store/tweet-store';
import { getTweetsToDelete } from '@/lib/filters/engine';
import { useDeleteBatch, useSaveBackup } from '@/lib/queries';
import { onDeleteProgress, isElectron } from '@/lib/ipc';
import TweetStats from '../tweets/TweetStats';
import TweetList from '../tweets/TweetList';
import type { DeletionProgress as DeletionProgressType } from '@/types';

export default function DeletionProgress() {
  const { tweets, filters, excludedTweetIds, deletionProgress } = useAppState();
  const dispatch = useAppDispatch();
  const [confirmed, setConfirmed] = useState(false);
  const deleteMutation = useDeleteBatch();
  const backupMutation = useSaveBackup();

  const toDelete = useMemo(
    () => getTweetsToDelete(tweets, filters, excludedTweetIds),
    [tweets, filters, excludedTweetIds],
  );

  const handleToggleExclude = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_EXCLUDE', payload: id });
  }, [dispatch]);

  const handleBackup = () => {
    if (!isElectron()) return;
    backupMutation.mutate(toDelete);
  };

  const handleDelete = () => {
    if (!isElectron() || !confirmed) return;

    dispatch({
      type: 'SET_DELETION_PROGRESS',
      payload: { total: toDelete.length, completed: 0, failed: 0, status: 'running' },
    });

    const tweetIds = toDelete.map(t => t.id);
    deleteMutation.mutate(tweetIds, {
      onSuccess: () => {
        dispatch({ type: 'SET_DELETION_PROGRESS', payload: { status: 'done' } });
        dispatch({ type: 'REMOVE_DELETED_TWEETS', payload: tweetIds });
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

  const isRunning = deletionProgress.status === 'running';
  const isDone = deletionProgress.status === 'done';
  const progress = deletionProgress.total > 0
    ? Math.round((deletionProgress.completed / deletionProgress.total) * 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">삭제 미리보기</h2>
      <p className="text-neutral-500 mb-6">
        아래 트윗들이 삭제됩니다. 체크를 해제하면 보존할 수 있습니다.
      </p>

      <TweetStats
        total={tweets.length}
        toDelete={toDelete.length}
        preserved={tweets.length - toDelete.length}
      />

      {isDone ? (
        <div className="p-6 bg-green-50 dark:bg-green-950 rounded-lg text-center mb-6">
          <p className="text-lg font-bold text-green-600">삭제 완료</p>
          <p className="text-sm text-green-500 mt-1">
            {deletionProgress.completed}개 삭제 완료
            {deletionProgress.failed > 0 && ` / ${deletionProgress.failed}개 실패`}
          </p>
        </div>
      ) : isRunning ? (
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
            {deletionProgress.failed > 0 && ` (${deletionProgress.failed}개 실패)`}
          </p>
        </div>
      ) : (
        <>
          <TweetList
            tweets={toDelete}
            showCheckbox
            checkedIds={excludedTweetIds}
            onToggle={handleToggleExclude}
          />

          <div className="mt-6 space-y-3">
            <button
              onClick={handleBackup}
              disabled={backupMutation.isPending}
              className="w-full py-2 px-4 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              {backupMutation.isPending ? '저장 중...' : '삭제 대상 백업 다운로드 (JSON)'}
            </button>

            <label className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-red-600">
                {toDelete.length.toLocaleString()}개의 트윗을 영구 삭제하는 것에 동의합니다
              </span>
            </label>

            <button
              onClick={handleDelete}
              disabled={!confirmed}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-neutral-400 text-white rounded-lg font-medium transition-colors"
            >
              {toDelete.length.toLocaleString()}개 트윗 삭제 실행
            </button>

            <button
              onClick={() => dispatch({ type: 'SET_STEP', payload: 'filter' })}
              className="w-full py-2 px-4 text-neutral-500 hover:text-neutral-700 transition-colors text-sm"
            >
              필터 설정으로 돌아가기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
