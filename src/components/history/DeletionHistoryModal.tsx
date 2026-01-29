'use client';

import { History, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { loadHistory } from '@/lib/ipc';
import type { DeletionHistoryEntry } from '@/types';

interface DeletionHistoryModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DeletionHistoryModal({
  open,
  onClose,
}: DeletionHistoryModalProps) {
  const [history, setHistory] = useState<DeletionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      loadHistory()
        .then((result) => {
          if (result.success && result.data) {
            setHistory(result.data);
          } else {
            setError(result.error || '히스토리를 불러오는데 실패했습니다.');
          }
        })
        .catch((err) => {
          setError((err as Error).message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open]);

  if (!open) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-lg w-full shadow-xl max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-neutral-500" />
            <h3 className="font-bold text-lg">삭제 히스토리</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <p className="text-center text-neutral-500 py-8">불러오는 중...</p>
          )}

          {error && <p className="text-center text-red-500 py-8">{error}</p>}

          {!loading && !error && history.length === 0 && (
            <p className="text-center text-neutral-500 py-8">
              삭제 기록이 없습니다.
            </p>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {entry.count}개 삭제
                      {entry.failedCount > 0 && (
                        <span className="text-red-500 ml-2">
                          ({entry.failedCount}개 실패)
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {formatDate(entry.deletedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
