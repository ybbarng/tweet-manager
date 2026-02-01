'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { FilterCombineMode } from '@/lib/filters/types';
import { useAppStore } from '@/lib/store/app-store';
import BooleanFilterRow from './BooleanFilterRow';
import DateFilterRow from './DateFilterRow';
import KeywordFilter from './KeywordFilter';
import NumericFilterRow from './NumericFilterRow';
import { sqlComment, sqlKeyword, sqlNumber, sqlString } from './styles';
import ThreadFilter from './ThreadFilter';

export interface QueryBuilderProps {
  resultCount: number;
}

/** AND/OR 커넥터 컴포넌트 */
function CombineModeConnector({
  mode,
  onToggle,
}: {
  mode: FilterCombineMode;
  onToggle: () => void;
}) {
  return (
    <div className="ml-4 my-1 flex items-center gap-2">
      <span className="w-16" />
      <button
        type="button"
        onClick={onToggle}
        className={`px-2 py-0.5 rounded text-xs font-bold ${sqlKeyword} bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50`}
      >
        {mode}
      </button>
    </div>
  );
}

export default function QueryBuilder({ resultCount }: QueryBuilderProps) {
  const [customLimit, setCustomLimit] = useState('');
  const [isCustomLimit, setIsCustomLimit] = useState(false);

  // zustand 스토어에서 직접 상태와 액션 가져오기
  const {
    filterState,
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
    setHasPhotoEnabled,
    setHasPhotoValue,
    setHasVideoEnabled,
    setHasVideoValue,
    setReplyEnabled,
    setReplyValue,
    setStartDateEnabled,
    setStartDate,
    setEndDateEnabled,
    setEndDate,
    setDisplayLimit,
  } = useAppStore();

  const { combineMode, displayLimit: limit } = filterState;

  const handleLimitChange = (value: string) => {
    if (value === 'all') {
      setDisplayLimit(null);
      setIsCustomLimit(false);
    } else if (value === 'custom') {
      setIsCustomLimit(true);
      setCustomLimit(limit ? String(limit) : '');
    } else {
      setDisplayLimit(Number.parseInt(value, 10));
      setIsCustomLimit(false);
    }
  };

  const handleCustomLimitChange = (value: string) => {
    setCustomLimit(value);
    const num = Number.parseInt(value, 10);
    if (num > 0) {
      setDisplayLimit(num);
    }
  };

  // 활성화된 필터 목록 (순서대로)
  const enabledFilters: string[] = [];
  if (filterState.likes.enabled) enabledFilters.push('likes');
  if (filterState.retweets.enabled) enabledFilters.push('retweets');
  if (filterState.views.enabled) enabledFilters.push('views');
  if (filterState.keyword.enabled) enabledFilters.push('keyword');
  if (filterState.hasPhoto.enabled) enabledFilters.push('hasPhoto');
  if (filterState.hasVideo.enabled) enabledFilters.push('hasVideo');
  if (filterState.reply.enabled) enabledFilters.push('reply');
  if (filterState.thread.enabled) enabledFilters.push('thread');
  if (filterState.startDate.enabled) enabledFilters.push('startDate');
  if (filterState.endDate.enabled) enabledFilters.push('endDate');

  const hasActiveConditions = enabledFilters.length > 0;

  // 현재 limit 값이 프리셋에 있는지 확인
  const isPresetLimit =
    limit === null || limit === 50 || limit === 100 || limit === 500;
  const selectValue = isCustomLimit
    ? 'custom'
    : limit === null
      ? 'all'
      : isPresetLimit
        ? String(limit)
        : 'custom';

  const toggleCombineMode = () => {
    setCombineMode(combineMode === 'OR' ? 'AND' : 'OR');
  };

  // 각 필터가 몇 번째 활성화된 필터인지 확인
  const getFilterIndex = (filterName: string) =>
    enabledFilters.indexOf(filterName);
  const shouldShowConnector = (filterName: string) => {
    const index = getFilterIndex(filterName);
    return index > 0;
  };

  return (
    <TooltipProvider>
      <div className="font-mono text-sm bg-neutral-100 dark:bg-neutral-900 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
        {/* DELETE FROM tweets WHERE */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={sqlKeyword}>DELETE</span>{' '}
          <span className={sqlKeyword}>FROM</span>{' '}
          <span className={sqlString}>tweets</span>{' '}
          <span className={sqlKeyword}>WHERE</span>
        </div>

        {/* likes 조건 */}
        {shouldShowConnector('likes') && (
          <CombineModeConnector
            mode={combineMode}
            onToggle={toggleCombineMode}
          />
        )}
        <NumericFilterRow
          label="좋아요 수"
          fieldName="likes"
          enabled={filterState.likes.enabled}
          operator={filterState.likes.operator}
          value={filterState.likes.value}
          onEnabledChange={setLikesEnabled}
          onOperatorChange={setLikesOperator}
          onValueChange={setLikesValue}
          isFirst
        />

        {/* retweets 조건 */}
        {shouldShowConnector('retweets') && (
          <CombineModeConnector
            mode={combineMode}
            onToggle={toggleCombineMode}
          />
        )}
        <NumericFilterRow
          label="리트윗 수"
          fieldName="retweets"
          enabled={filterState.retweets.enabled}
          operator={filterState.retweets.operator}
          value={filterState.retweets.value}
          onEnabledChange={setRetweetsEnabled}
          onOperatorChange={setRetweetsOperator}
          onValueChange={setRetweetsValue}
        />

        {/* views 조건 */}
        {shouldShowConnector('views') && (
          <CombineModeConnector
            mode={combineMode}
            onToggle={toggleCombineMode}
          />
        )}
        <NumericFilterRow
          label="조회 수"
          fieldName="views"
          enabled={filterState.views.enabled}
          operator={filterState.views.operator}
          value={filterState.views.value}
          onEnabledChange={setViewsEnabled}
          onOperatorChange={setViewsOperator}
          onValueChange={setViewsValue}
          inputWidth="w-24"
        />

        {/* 키워드 조건 */}
        {shouldShowConnector('keyword') && (
          <CombineModeConnector
            mode={combineMode}
            onToggle={toggleCombineMode}
          />
        )}
        <KeywordFilter />

        {/* has_photo 조건 */}
        {shouldShowConnector('hasPhoto') && (
          <CombineModeConnector
            mode={combineMode}
            onToggle={toggleCombineMode}
          />
        )}
        <BooleanFilterRow
          label="사진"
          fieldName="has_photo"
          enabled={filterState.hasPhoto.enabled}
          value={filterState.hasPhoto.value}
          onEnabledChange={setHasPhotoEnabled}
          onValueChange={setHasPhotoValue}
          isFirst
        />

        {/* has_video 조건 */}
        {shouldShowConnector('hasVideo') && (
          <CombineModeConnector
            mode={combineMode}
            onToggle={toggleCombineMode}
          />
        )}
        <BooleanFilterRow
          label="동영상"
          fieldName="has_video"
          enabled={filterState.hasVideo.enabled}
          value={filterState.hasVideo.value}
          onEnabledChange={setHasVideoEnabled}
          onValueChange={setHasVideoValue}
        />

        {/* 답글 조건 */}
        {shouldShowConnector('reply') && (
          <CombineModeConnector
            mode={combineMode}
            onToggle={toggleCombineMode}
          />
        )}
        <BooleanFilterRow
          label="답글"
          fieldName="is_reply"
          enabled={filterState.reply.enabled}
          value={filterState.reply.value}
          onEnabledChange={setReplyEnabled}
          onValueChange={setReplyValue}
        />

        {/* thread_id NOT IN 조건 */}
        {shouldShowConnector('thread') && (
          <CombineModeConnector
            mode={combineMode}
            onToggle={toggleCombineMode}
          />
        )}
        <ThreadFilter />

        {/* created_at >= 시작일 조건 */}
        {shouldShowConnector('startDate') && (
          <CombineModeConnector
            mode={combineMode}
            onToggle={toggleCombineMode}
          />
        )}
        <DateFilterRow
          label="시작일"
          enabled={filterState.startDate.enabled}
          date={filterState.startDate.date}
          operator=">="
          onEnabledChange={setStartDateEnabled}
          onDateChange={setStartDate}
          isFirst
        />

        {/* created_at <= 종료일 조건 */}
        {shouldShowConnector('endDate') && (
          <CombineModeConnector
            mode={combineMode}
            onToggle={toggleCombineMode}
          />
        )}
        <DateFilterRow
          label="종료일"
          enabled={filterState.endDate.enabled}
          date={filterState.endDate.date}
          operator="<="
          onEnabledChange={setEndDateEnabled}
          onDateChange={setEndDate}
        />

        {/* LIMIT */}
        <div className="mt-4 flex items-center gap-2">
          <span className={sqlKeyword}>LIMIT</span>
          <Select value={selectValue} onValueChange={handleLimitChange}>
            <SelectTrigger className="w-28 h-7 bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700">
              <SelectItem
                value="all"
                className="text-neutral-800 dark:text-neutral-200 focus:bg-neutral-100 dark:focus:bg-neutral-700"
              >
                전체
              </SelectItem>
              <SelectItem
                value="50"
                className="text-neutral-800 dark:text-neutral-200 focus:bg-neutral-100 dark:focus:bg-neutral-700"
              >
                50
              </SelectItem>
              <SelectItem
                value="100"
                className="text-neutral-800 dark:text-neutral-200 focus:bg-neutral-100 dark:focus:bg-neutral-700"
              >
                100
              </SelectItem>
              <SelectItem
                value="500"
                className="text-neutral-800 dark:text-neutral-200 focus:bg-neutral-100 dark:focus:bg-neutral-700"
              >
                500
              </SelectItem>
              <SelectItem
                value="custom"
                className="text-neutral-800 dark:text-neutral-200 focus:bg-neutral-100 dark:focus:bg-neutral-700"
              >
                직접 입력
              </SelectItem>
            </SelectContent>
          </Select>
          {(isCustomLimit || !isPresetLimit) && (
            <Input
              type="number"
              min={1}
              value={customLimit || (limit ? String(limit) : '')}
              onChange={(e) => handleCustomLimitChange(e.target.value)}
              placeholder="숫자 입력"
              className={`w-24 h-7 bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 ${sqlNumber}`}
            />
          )}
        </div>

        {/* 결과 (주석 스타일) */}
        <div className="mt-4 pt-4 border-t border-neutral-300 dark:border-neutral-700">
          <span className={sqlComment}>
            -- 결과:{' '}
            {hasActiveConditions
              ? `${resultCount.toLocaleString()}개 삭제 후보`
              : '조건을 선택하세요'}
            {enabledFilters.length >= 2 && ` (${combineMode} 조합)`}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
