'use client';

import TweetList from '@/components/tweets/TweetList';
import { Button } from '@/components/ui/button';
import type { Tweet } from '@/types';

interface TweetPreviewSectionProps {
  activeConditions: boolean;
  displayedTweets: Tweet[];
  deletionCandidatesCount: number;
  displayLimit: number | null;
  selectedForDeletion: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export default function TweetPreviewSection({
  activeConditions,
  displayedTweets,
  deletionCandidatesCount,
  displayLimit,
  selectedForDeletion,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
}: TweetPreviewSectionProps) {
  return (
    <>
      {/* 헤더 및 전체 선택/해제 버튼 */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-medium text-sm text-red-500">
            {activeConditions
              ? `삭제 후보 (${displayedTweets.length.toLocaleString()}개${displayLimit && deletionCandidatesCount > displayLimit ? ` / 전체 ${deletionCandidatesCount.toLocaleString()}개` : ''})`
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
              onClick={onSelectAll}
              disabled={selectedForDeletion.size === displayedTweets.length}
            >
              전체 선택
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDeselectAll}
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
          onToggle={onToggleSelection}
          invertChecked
        />
      ) : (
        <div className="h-[500px] flex items-center justify-center border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900">
          <p className="text-neutral-500">
            삭제 조건을 선택하면 트윗이 표시됩니다
          </p>
        </div>
      )}
    </>
  );
}
