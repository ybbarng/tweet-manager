'use client';

import { useAppStore } from '@/lib/store/app-store';

export default function DeletionStatus() {
  const { deletionProgress } = useAppStore();

  const progress =
    deletionProgress.total > 0
      ? Math.round((deletionProgress.completed / deletionProgress.total) * 100)
      : 0;

  const isDone = deletionProgress.status === 'done';
  const isStopped = deletionProgress.status === 'stopped';
  const isRunning = deletionProgress.status === 'running';

  if (!isDone && !isStopped && !isRunning) {
    return null;
  }

  return (
    <>
      {/* 삭제 완료 */}
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

      {/* 삭제 중단됨 */}
      {isStopped && (
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

      {/* 삭제 진행 중 */}
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
    </>
  );
}
