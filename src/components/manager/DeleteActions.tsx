'use client';

import { Checkbox } from '@/components/ui/checkbox';
import type { Tweet } from '@/types';

interface DeleteActionsProps {
  toDelete: Tweet[];
  confirmed: boolean;
  backupBeforeDelete: boolean;
  backupPending: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
  onBackupBeforeDeleteChange: (backup: boolean) => void;
  onBackup: () => void;
  onDelete: () => void;
}

export default function DeleteActions({
  toDelete,
  confirmed,
  backupBeforeDelete,
  backupPending,
  onConfirmedChange,
  onBackupBeforeDeleteChange,
  onBackup,
  onDelete,
}: DeleteActionsProps) {
  return (
    <div className="mt-6 space-y-3">
      <button
        type="button"
        onClick={onBackup}
        disabled={backupPending || toDelete.length === 0}
        className="w-full py-2 px-4 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
      >
        {backupPending ? '저장 중...' : '선택한 트윗 백업 다운로드 (JSON)'}
      </button>

      {/* 삭제 전 백업 옵션 */}
      <div className="flex items-center gap-2 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        <Checkbox
          id="backup-before-delete"
          checked={backupBeforeDelete}
          onCheckedChange={(checked) =>
            onBackupBeforeDeleteChange(checked === true)
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
          onCheckedChange={(checked) => onConfirmedChange(checked === true)}
          disabled={toDelete.length === 0}
          className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
        />
        <label
          htmlFor="confirm-delete"
          className="text-sm text-red-600 cursor-pointer"
        >
          {toDelete.length.toLocaleString()}개의 트윗을 영구 삭제하는 것에
          동의합니다.
        </label>
      </div>

      <button
        type="button"
        onClick={onDelete}
        disabled={!confirmed || toDelete.length === 0}
        className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-neutral-400 text-white rounded-lg font-medium transition-colors"
      >
        {toDelete.length.toLocaleString()}개 트윗 삭제 실행
      </button>
    </div>
  );
}
