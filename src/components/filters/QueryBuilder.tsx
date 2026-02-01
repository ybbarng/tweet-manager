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
import type {
  ComparisonOperator,
  FilterCombineMode,
} from '@/lib/filters/types';
import type { Tweet } from '@/types';
import BooleanFilterRow from './BooleanFilterRow';
import DateFilterRow from './DateFilterRow';
import KeywordFilter from './KeywordFilter';
import NumericFilterRow from './NumericFilterRow';
import { sqlComment, sqlKeyword, sqlNumber, sqlString } from './styles';
import ThreadFilter from './ThreadFilter';

export interface QueryBuilderProps {
  tweets: Tweet[];
  // 조합 모드
  combineMode: FilterCombineMode;
  onCombineModeChange: (mode: FilterCombineMode) => void;
  // 숫자 필터 (likes)
  likesEnabled: boolean;
  likesOperator: ComparisonOperator;
  minLikes: number;
  onLikesEnabledChange: (enabled: boolean) => void;
  onLikesOperatorChange: (op: ComparisonOperator) => void;
  onMinLikesChange: (value: number) => void;
  // 숫자 필터 (retweets)
  retweetsEnabled: boolean;
  retweetsOperator: ComparisonOperator;
  minRetweets: number;
  onRetweetsEnabledChange: (enabled: boolean) => void;
  onRetweetsOperatorChange: (op: ComparisonOperator) => void;
  onMinRetweetsChange: (value: number) => void;
  // 숫자 필터 (views)
  viewsEnabled: boolean;
  viewsOperator: ComparisonOperator;
  minViews: number;
  onViewsEnabledChange: (enabled: boolean) => void;
  onViewsOperatorChange: (op: ComparisonOperator) => void;
  onMinViewsChange: (value: number) => void;
  // 키워드 필터
  keywordEnabled: boolean;
  keywords: string[];
  keywordMatchMode: 'any' | 'all';
  keywordNegate: boolean;
  onKeywordEnabledChange: (enabled: boolean) => void;
  onKeywordsChange: (keywords: string[]) => void;
  onKeywordMatchModeChange: (mode: 'any' | 'all') => void;
  onKeywordNegateChange: (negate: boolean) => void;
  // 미디어 필터 (has_photo)
  hasPhotoEnabled: boolean;
  hasPhotoValue: boolean;
  onHasPhotoEnabledChange: (enabled: boolean) => void;
  onHasPhotoValueChange: (value: boolean) => void;
  // 미디어 필터 (has_video)
  hasVideoEnabled: boolean;
  hasVideoValue: boolean;
  onHasVideoEnabledChange: (enabled: boolean) => void;
  onHasVideoValueChange: (value: boolean) => void;
  // 답글 필터
  replyEnabled: boolean;
  replyIsReply: boolean;
  onReplyEnabledChange: (enabled: boolean) => void;
  onReplyIsReplyChange: (isReply: boolean) => void;
  // 타래 필터
  threadEnabled: boolean;
  excludedThreadIds: string[];
  onThreadEnabledChange: (enabled: boolean) => void;
  onExcludedThreadIdsChange: (ids: string[]) => void;
  // 날짜 범위 필터 (start)
  startDateEnabled: boolean;
  startDate: string | null;
  onStartDateEnabledChange: (enabled: boolean) => void;
  onStartDateChange: (date: string | null) => void;
  // 날짜 범위 필터 (end)
  endDateEnabled: boolean;
  endDate: string | null;
  onEndDateEnabledChange: (enabled: boolean) => void;
  onEndDateChange: (date: string | null) => void;
  // 기타
  limit: number | null;
  onLimitChange: (limit: number | null) => void;
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

export default function QueryBuilder({
  tweets,
  combineMode,
  onCombineModeChange,
  likesEnabled,
  likesOperator,
  minLikes,
  onLikesEnabledChange,
  onLikesOperatorChange,
  onMinLikesChange,
  retweetsEnabled,
  retweetsOperator,
  minRetweets,
  onRetweetsEnabledChange,
  onRetweetsOperatorChange,
  onMinRetweetsChange,
  viewsEnabled,
  viewsOperator,
  minViews,
  onViewsEnabledChange,
  onViewsOperatorChange,
  onMinViewsChange,
  keywordEnabled,
  keywords,
  keywordMatchMode,
  keywordNegate,
  onKeywordEnabledChange,
  onKeywordsChange,
  onKeywordMatchModeChange,
  onKeywordNegateChange,
  hasPhotoEnabled,
  hasPhotoValue,
  onHasPhotoEnabledChange,
  onHasPhotoValueChange,
  hasVideoEnabled,
  hasVideoValue,
  onHasVideoEnabledChange,
  onHasVideoValueChange,
  replyEnabled,
  replyIsReply,
  onReplyEnabledChange,
  onReplyIsReplyChange,
  threadEnabled,
  excludedThreadIds,
  onThreadEnabledChange,
  onExcludedThreadIdsChange,
  startDateEnabled,
  startDate,
  onStartDateEnabledChange,
  onStartDateChange,
  endDateEnabled,
  endDate,
  onEndDateEnabledChange,
  onEndDateChange,
  limit,
  onLimitChange,
  resultCount,
}: QueryBuilderProps) {
  const [customLimit, setCustomLimit] = useState('');
  const [isCustomLimit, setIsCustomLimit] = useState(false);

  const handleLimitChange = (value: string) => {
    if (value === 'all') {
      onLimitChange(null);
      setIsCustomLimit(false);
    } else if (value === 'custom') {
      setIsCustomLimit(true);
      setCustomLimit(limit ? String(limit) : '');
    } else {
      onLimitChange(Number.parseInt(value, 10));
      setIsCustomLimit(false);
    }
  };

  const handleCustomLimitChange = (value: string) => {
    setCustomLimit(value);
    const num = Number.parseInt(value, 10);
    if (num > 0) {
      onLimitChange(num);
    }
  };

  // 활성화된 필터 목록 (순서대로)
  const enabledFilters: string[] = [];
  if (likesEnabled) enabledFilters.push('likes');
  if (retweetsEnabled) enabledFilters.push('retweets');
  if (viewsEnabled) enabledFilters.push('views');
  if (keywordEnabled) enabledFilters.push('keyword');
  if (hasPhotoEnabled) enabledFilters.push('hasPhoto');
  if (hasVideoEnabled) enabledFilters.push('hasVideo');
  if (replyEnabled) enabledFilters.push('reply');
  if (threadEnabled) enabledFilters.push('thread');
  if (startDateEnabled) enabledFilters.push('startDate');
  if (endDateEnabled) enabledFilters.push('endDate');

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
    onCombineModeChange(combineMode === 'OR' ? 'AND' : 'OR');
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
          enabled={likesEnabled}
          operator={likesOperator}
          value={minLikes}
          onEnabledChange={onLikesEnabledChange}
          onOperatorChange={onLikesOperatorChange}
          onValueChange={onMinLikesChange}
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
          enabled={retweetsEnabled}
          operator={retweetsOperator}
          value={minRetweets}
          onEnabledChange={onRetweetsEnabledChange}
          onOperatorChange={onRetweetsOperatorChange}
          onValueChange={onMinRetweetsChange}
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
          enabled={viewsEnabled}
          operator={viewsOperator}
          value={minViews}
          onEnabledChange={onViewsEnabledChange}
          onOperatorChange={onViewsOperatorChange}
          onValueChange={onMinViewsChange}
          inputWidth="w-24"
        />

        {/* 키워드 조건 */}
        {shouldShowConnector('keyword') && (
          <CombineModeConnector
            mode={combineMode}
            onToggle={toggleCombineMode}
          />
        )}
        <KeywordFilter
          enabled={keywordEnabled}
          keywords={keywords}
          matchMode={keywordMatchMode}
          negate={keywordNegate}
          onEnabledChange={onKeywordEnabledChange}
          onKeywordsChange={onKeywordsChange}
          onMatchModeChange={onKeywordMatchModeChange}
          onNegateChange={onKeywordNegateChange}
        />

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
          enabled={hasPhotoEnabled}
          value={hasPhotoValue}
          onEnabledChange={onHasPhotoEnabledChange}
          onValueChange={onHasPhotoValueChange}
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
          enabled={hasVideoEnabled}
          value={hasVideoValue}
          onEnabledChange={onHasVideoEnabledChange}
          onValueChange={onHasVideoValueChange}
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
          enabled={replyEnabled}
          value={replyIsReply}
          onEnabledChange={onReplyEnabledChange}
          onValueChange={onReplyIsReplyChange}
        />

        {/* thread_id NOT IN 조건 */}
        {shouldShowConnector('thread') && (
          <CombineModeConnector
            mode={combineMode}
            onToggle={toggleCombineMode}
          />
        )}
        <ThreadFilter
          tweets={tweets}
          enabled={threadEnabled}
          excludedIds={excludedThreadIds}
          onEnabledChange={onThreadEnabledChange}
          onExcludedIdsChange={onExcludedThreadIdsChange}
        />

        {/* created_at >= 시작일 조건 */}
        {shouldShowConnector('startDate') && (
          <CombineModeConnector
            mode={combineMode}
            onToggle={toggleCombineMode}
          />
        )}
        <DateFilterRow
          label="시작일"
          enabled={startDateEnabled}
          date={startDate}
          operator=">="
          onEnabledChange={onStartDateEnabledChange}
          onDateChange={onStartDateChange}
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
          enabled={endDateEnabled}
          date={endDate}
          operator="<="
          onEnabledChange={onEndDateEnabledChange}
          onDateChange={onEndDateChange}
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
