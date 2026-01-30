'use client';

import { HelpCircle, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type {
  ComparisonOperator,
  FilterCombineMode,
} from '@/lib/filters/types';
import type { Tweet } from '@/types';

export interface QueryBuilderProps {
  tweets: Tweet[];
  // 조합 모드
  combineMode: FilterCombineMode;
  onCombineModeChange: (mode: FilterCombineMode) => void;
  // 숫자 필터 (likes)
  likesEnabled: boolean;
  likesOperator: ComparisonOperator;
  minLikes: number;
  likesNegate: boolean;
  onLikesEnabledChange: (enabled: boolean) => void;
  onLikesOperatorChange: (op: ComparisonOperator) => void;
  onMinLikesChange: (value: number) => void;
  onLikesNegateChange: (negate: boolean) => void;
  // 숫자 필터 (retweets)
  retweetsEnabled: boolean;
  retweetsOperator: ComparisonOperator;
  minRetweets: number;
  retweetsNegate: boolean;
  onRetweetsEnabledChange: (enabled: boolean) => void;
  onRetweetsOperatorChange: (op: ComparisonOperator) => void;
  onMinRetweetsChange: (value: number) => void;
  onRetweetsNegateChange: (negate: boolean) => void;
  // 숫자 필터 (views)
  viewsEnabled: boolean;
  viewsOperator: ComparisonOperator;
  minViews: number;
  viewsNegate: boolean;
  onViewsEnabledChange: (enabled: boolean) => void;
  onViewsOperatorChange: (op: ComparisonOperator) => void;
  onMinViewsChange: (value: number) => void;
  onViewsNegateChange: (negate: boolean) => void;
  // 키워드 필터
  keywordEnabled: boolean;
  keywords: string[];
  keywordMatchMode: 'any' | 'all';
  keywordNegate: boolean;
  onKeywordEnabledChange: (enabled: boolean) => void;
  onKeywordsChange: (keywords: string[]) => void;
  onKeywordMatchModeChange: (mode: 'any' | 'all') => void;
  onKeywordNegateChange: (negate: boolean) => void;
  // 미디어 필터
  mediaEnabled: boolean;
  mediaType: 'photo' | 'video' | 'any' | 'none';
  mediaNegate: boolean;
  onMediaEnabledChange: (enabled: boolean) => void;
  onMediaTypeChange: (type: 'photo' | 'video' | 'any' | 'none') => void;
  onMediaNegateChange: (negate: boolean) => void;
  // 답글 필터
  replyEnabled: boolean;
  replyIsReply: boolean;
  replyNegate: boolean;
  onReplyEnabledChange: (enabled: boolean) => void;
  onReplyIsReplyChange: (isReply: boolean) => void;
  onReplyNegateChange: (negate: boolean) => void;
  // 타래 필터
  threadEnabled: boolean;
  excludedThreadIds: string[];
  onThreadEnabledChange: (enabled: boolean) => void;
  onExcludedThreadIdsChange: (ids: string[]) => void;
  // 날짜 범위 필터
  dateRangeEnabled: boolean;
  startDate: string | null;
  endDate: string | null;
  onDateRangeEnabledChange: (enabled: boolean) => void;
  onStartDateChange: (date: string | null) => void;
  onEndDateChange: (date: string | null) => void;
  // 기타
  limit: number | null;
  onLimitChange: (limit: number | null) => void;
  resultCount: number;
}

/** 트윗 URL에서 ID를 추출 */
function extractTweetId(input: string): string | null {
  const urlMatch = input.match(/(?:twitter|x)\.com\/\w+\/status\/(\d+)/);
  if (urlMatch) return urlMatch[1];
  if (/^\d+$/.test(input.trim())) return input.trim();
  return null;
}

/** SQL 키워드 스타일 클래스 */
const sqlKeyword = 'text-blue-600 dark:text-blue-400 font-semibold';
const sqlOperator = 'text-cyan-600 dark:text-cyan-400 font-semibold';
const sqlComment = 'text-neutral-400 dark:text-neutral-500';
const sqlString = 'text-orange-500 dark:text-orange-400';
const sqlNumber = 'text-green-600 dark:text-green-400';

const COMPARISON_OPERATORS: ComparisonOperator[] = ['>=', '>', '<=', '<', '='];

export default function QueryBuilder({
  tweets,
  combineMode,
  onCombineModeChange,
  likesEnabled,
  likesOperator,
  minLikes,
  likesNegate,
  onLikesEnabledChange,
  onLikesOperatorChange,
  onMinLikesChange,
  onLikesNegateChange,
  retweetsEnabled,
  retweetsOperator,
  minRetweets,
  retweetsNegate,
  onRetweetsEnabledChange,
  onRetweetsOperatorChange,
  onMinRetweetsChange,
  onRetweetsNegateChange,
  viewsEnabled,
  viewsOperator,
  minViews,
  viewsNegate,
  onViewsEnabledChange,
  onViewsOperatorChange,
  onMinViewsChange,
  onViewsNegateChange,
  keywordEnabled,
  keywords,
  keywordMatchMode,
  keywordNegate,
  onKeywordEnabledChange,
  onKeywordsChange,
  onKeywordMatchModeChange,
  onKeywordNegateChange,
  mediaEnabled,
  mediaType,
  mediaNegate,
  onMediaEnabledChange,
  onMediaTypeChange,
  onMediaNegateChange,
  replyEnabled,
  replyIsReply,
  replyNegate,
  onReplyEnabledChange,
  onReplyIsReplyChange,
  onReplyNegateChange,
  threadEnabled,
  excludedThreadIds,
  onThreadEnabledChange,
  onExcludedThreadIdsChange,
  dateRangeEnabled,
  startDate,
  endDate,
  onDateRangeEnabledChange,
  onStartDateChange,
  onEndDateChange,
  limit,
  onLimitChange,
  resultCount,
}: QueryBuilderProps) {
  const [threadInput, setThreadInput] = useState('');
  const [threadError, setThreadError] = useState('');
  const [customLimit, setCustomLimit] = useState('');
  const [isCustomLimit, setIsCustomLimit] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');

  // 쓰레드 목록 추출
  const threads = useMemo(() => {
    const threadStarts: Tweet[] = [];
    const seen = new Set<string>();

    for (const tweet of tweets) {
      if (tweet.conversationId && !seen.has(tweet.conversationId)) {
        const threadTweets = tweets.filter(
          (t) => t.conversationId === tweet.conversationId,
        );
        if (threadTweets.length >= 2) {
          const start =
            threadTweets.find((t) => t.id === tweet.conversationId) ||
            threadTweets.sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            )[0];
          if (start) {
            threadStarts.push(start);
            seen.add(tweet.conversationId);
          }
        }
      }
    }

    return threadStarts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [tweets]);

  const handleAddThreadId = () => {
    const id = extractTweetId(threadInput);
    if (!id) {
      setThreadError('유효한 트윗 URL 또는 ID를 입력해주세요.');
      return;
    }
    if (excludedThreadIds.includes(id)) {
      setThreadError('이미 추가된 ID입니다.');
      return;
    }
    onExcludedThreadIdsChange([...excludedThreadIds, id]);
    setThreadInput('');
    setThreadError('');
  };

  const handleSelectThread = (id: string) => {
    if (!excludedThreadIds.includes(id)) {
      onExcludedThreadIdsChange([...excludedThreadIds, id]);
    }
  };

  const handleRemoveThreadId = (id: string) => {
    onExcludedThreadIdsChange(excludedThreadIds.filter((tid) => tid !== id));
  };

  const handleAddKeyword = () => {
    const keyword = keywordInput.trim();
    if (keyword && !keywords.includes(keyword)) {
      onKeywordsChange([...keywords, keyword]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    onKeywordsChange(keywords.filter((k) => k !== keyword));
  };

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

  // 활성화된 조건 수 계산
  const activeConditions = [
    likesEnabled,
    retweetsEnabled,
    viewsEnabled,
    keywordEnabled,
    mediaEnabled,
    replyEnabled,
    threadEnabled,
    dateRangeEnabled,
  ].filter(Boolean);

  const hasActiveConditions = activeConditions.length > 0;

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

  // AND/OR 연결 표시 (2개 이상 활성화된 경우)
  const showConnector = activeConditions.length >= 2;

  return (
    <TooltipProvider>
      <div className="font-mono text-sm bg-neutral-100 dark:bg-neutral-900 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
        {/* DELETE FROM tweets WHERE */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={sqlKeyword}>DELETE</span>{' '}
          <span className={sqlKeyword}>FROM</span>{' '}
          <span className={sqlString}>tweets</span>{' '}
          <span className={sqlKeyword}>WHERE</span>
          {showConnector && (
            <span className="ml-2 text-xs text-neutral-500">
              (조건 조합:
              <button
                type="button"
                onClick={() =>
                  onCombineModeChange(combineMode === 'OR' ? 'AND' : 'OR')
                }
                className={`ml-1 px-1.5 py-0.5 rounded ${sqlKeyword} bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50`}
              >
                {combineMode}
              </button>
              )
            </span>
          )}
        </div>

        {/* likes 조건 */}
        <div className="ml-4 mt-3 flex items-center gap-2 flex-wrap">
          <Checkbox
            checked={likesEnabled}
            onCheckedChange={(checked) =>
              onLikesEnabledChange(checked === true)
            }
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          {likesNegate && (
            <span className={likesEnabled ? sqlKeyword : 'text-neutral-400'}>
              NOT
            </span>
          )}
          <span
            className={
              likesEnabled
                ? 'text-neutral-800 dark:text-neutral-200'
                : 'text-neutral-600 dark:text-neutral-400'
            }
          >
            likes
          </span>
          <Select
            value={likesOperator}
            onValueChange={(v) =>
              onLikesOperatorChange(v as ComparisonOperator)
            }
            disabled={!likesEnabled}
          >
            <SelectTrigger
              className={`w-16 h-7 ${likesEnabled ? sqlOperator : 'text-neutral-400'}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPARISON_OPERATORS.map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            value={minLikes}
            onChange={(e) =>
              onMinLikesChange(
                Math.max(0, Number.parseInt(e.target.value, 10) || 0),
              )
            }
            disabled={!likesEnabled}
            className={`w-20 h-7 border-neutral-300 dark:border-neutral-700 ${
              likesEnabled
                ? `${sqlNumber} bg-white dark:bg-neutral-800`
                : 'text-neutral-400 bg-neutral-50 dark:bg-neutral-900'
            }`}
          />
          {likesEnabled && (
            <label className="flex items-center gap-1 text-xs text-neutral-500 cursor-pointer">
              <input
                type="checkbox"
                checked={likesNegate}
                onChange={(e) => onLikesNegateChange(e.target.checked)}
                className="w-3 h-3"
              />
              NOT
            </label>
          )}
        </div>

        {/* retweets 조건 */}
        <div className="ml-4 mt-1 flex items-center gap-2 flex-wrap">
          <Checkbox
            checked={retweetsEnabled}
            onCheckedChange={(checked) =>
              onRetweetsEnabledChange(checked === true)
            }
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          {retweetsNegate && (
            <span className={retweetsEnabled ? sqlKeyword : 'text-neutral-400'}>
              NOT
            </span>
          )}
          <span
            className={
              retweetsEnabled
                ? 'text-neutral-800 dark:text-neutral-200'
                : 'text-neutral-600 dark:text-neutral-400'
            }
          >
            retweets
          </span>
          <Select
            value={retweetsOperator}
            onValueChange={(v) =>
              onRetweetsOperatorChange(v as ComparisonOperator)
            }
            disabled={!retweetsEnabled}
          >
            <SelectTrigger
              className={`w-16 h-7 ${retweetsEnabled ? sqlOperator : 'text-neutral-400'}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPARISON_OPERATORS.map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            value={minRetweets}
            onChange={(e) =>
              onMinRetweetsChange(
                Math.max(0, Number.parseInt(e.target.value, 10) || 0),
              )
            }
            disabled={!retweetsEnabled}
            className={`w-20 h-7 border-neutral-300 dark:border-neutral-700 ${
              retweetsEnabled
                ? `${sqlNumber} bg-white dark:bg-neutral-800`
                : 'text-neutral-400 bg-neutral-50 dark:bg-neutral-900'
            }`}
          />
          {retweetsEnabled && (
            <label className="flex items-center gap-1 text-xs text-neutral-500 cursor-pointer">
              <input
                type="checkbox"
                checked={retweetsNegate}
                onChange={(e) => onRetweetsNegateChange(e.target.checked)}
                className="w-3 h-3"
              />
              NOT
            </label>
          )}
        </div>

        {/* views 조건 */}
        <div className="ml-4 mt-1 flex items-center gap-2 flex-wrap">
          <Checkbox
            checked={viewsEnabled}
            onCheckedChange={(checked) =>
              onViewsEnabledChange(checked === true)
            }
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          {viewsNegate && (
            <span className={viewsEnabled ? sqlKeyword : 'text-neutral-400'}>
              NOT
            </span>
          )}
          <span
            className={
              viewsEnabled
                ? 'text-neutral-800 dark:text-neutral-200'
                : 'text-neutral-600 dark:text-neutral-400'
            }
          >
            views
          </span>
          <Select
            value={viewsOperator}
            onValueChange={(v) =>
              onViewsOperatorChange(v as ComparisonOperator)
            }
            disabled={!viewsEnabled}
          >
            <SelectTrigger
              className={`w-16 h-7 ${viewsEnabled ? sqlOperator : 'text-neutral-400'}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPARISON_OPERATORS.map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            value={minViews}
            onChange={(e) =>
              onMinViewsChange(
                Math.max(0, Number.parseInt(e.target.value, 10) || 0),
              )
            }
            disabled={!viewsEnabled}
            className={`w-24 h-7 border-neutral-300 dark:border-neutral-700 ${
              viewsEnabled
                ? `${sqlNumber} bg-white dark:bg-neutral-800`
                : 'text-neutral-400 bg-neutral-50 dark:bg-neutral-900'
            }`}
          />
          {viewsEnabled && (
            <label className="flex items-center gap-1 text-xs text-neutral-500 cursor-pointer">
              <input
                type="checkbox"
                checked={viewsNegate}
                onChange={(e) => onViewsNegateChange(e.target.checked)}
                className="w-3 h-3"
              />
              NOT
            </label>
          )}
        </div>

        {/* 키워드 조건 */}
        <div className="ml-4 mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Checkbox
              checked={keywordEnabled}
              onCheckedChange={(checked) =>
                onKeywordEnabledChange(checked === true)
              }
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            {keywordNegate && (
              <span
                className={keywordEnabled ? sqlKeyword : 'text-neutral-400'}
              >
                NOT
              </span>
            )}
            <span
              className={
                keywordEnabled
                  ? 'text-neutral-800 dark:text-neutral-200'
                  : 'text-neutral-600 dark:text-neutral-400'
              }
            >
              text
            </span>
            <span className={keywordEnabled ? sqlKeyword : 'text-neutral-400'}>
              CONTAINS
            </span>
            <Select
              value={keywordMatchMode}
              onValueChange={(v) =>
                onKeywordMatchModeChange(v as 'any' | 'all')
              }
              disabled={!keywordEnabled}
            >
              <SelectTrigger
                className={`w-20 h-7 ${keywordEnabled ? sqlOperator : 'text-neutral-400'}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">ANY</SelectItem>
                <SelectItem value="all">ALL</SelectItem>
              </SelectContent>
            </Select>
            {keywordEnabled && (
              <label className="flex items-center gap-1 text-xs text-neutral-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keywordNegate}
                  onChange={(e) => onKeywordNegateChange(e.target.checked)}
                  className="w-3 h-3"
                />
                NOT
              </label>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  ANY: 키워드 중 하나라도 포함된 트윗
                  <br />
                  ALL: 모든 키워드가 포함된 트윗
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {keywordEnabled && (
            <div className="ml-8 mt-2 space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="키워드 입력"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  className="flex-1 h-7 bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200"
                />
                <Button
                  size="sm"
                  onClick={handleAddKeyword}
                  className="h-7 bg-blue-600 hover:bg-blue-500"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${sqlString} bg-orange-100 dark:bg-orange-900/20`}
                  >
                    "{keyword}"
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 미디어 조건 */}
        <div className="ml-4 mt-3 flex items-center gap-2 flex-wrap">
          <Checkbox
            checked={mediaEnabled}
            onCheckedChange={(checked) =>
              onMediaEnabledChange(checked === true)
            }
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          {mediaNegate && (
            <span className={mediaEnabled ? sqlKeyword : 'text-neutral-400'}>
              NOT
            </span>
          )}
          <span
            className={
              mediaEnabled
                ? 'text-neutral-800 dark:text-neutral-200'
                : 'text-neutral-600 dark:text-neutral-400'
            }
          >
            media
          </span>
          <span className={mediaEnabled ? sqlOperator : 'text-neutral-400'}>
            =
          </span>
          <Select
            value={mediaType}
            onValueChange={(v) =>
              onMediaTypeChange(v as 'photo' | 'video' | 'any' | 'none')
            }
            disabled={!mediaEnabled}
          >
            <SelectTrigger
              className={`w-24 h-7 ${mediaEnabled ? sqlString : 'text-neutral-400'}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">있음</SelectItem>
              <SelectItem value="none">없음</SelectItem>
              <SelectItem value="photo">사진</SelectItem>
              <SelectItem value="video">동영상</SelectItem>
            </SelectContent>
          </Select>
          {mediaEnabled && (
            <label className="flex items-center gap-1 text-xs text-neutral-500 cursor-pointer">
              <input
                type="checkbox"
                checked={mediaNegate}
                onChange={(e) => onMediaNegateChange(e.target.checked)}
                className="w-3 h-3"
              />
              NOT
            </label>
          )}
        </div>

        {/* 답글 조건 */}
        <div className="ml-4 mt-1 flex items-center gap-2 flex-wrap">
          <Checkbox
            checked={replyEnabled}
            onCheckedChange={(checked) =>
              onReplyEnabledChange(checked === true)
            }
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          {replyNegate && (
            <span className={replyEnabled ? sqlKeyword : 'text-neutral-400'}>
              NOT
            </span>
          )}
          <span
            className={
              replyEnabled
                ? 'text-neutral-800 dark:text-neutral-200'
                : 'text-neutral-600 dark:text-neutral-400'
            }
          >
            is_reply
          </span>
          <span className={replyEnabled ? sqlOperator : 'text-neutral-400'}>
            =
          </span>
          <Select
            value={replyIsReply ? 'true' : 'false'}
            onValueChange={(v) => onReplyIsReplyChange(v === 'true')}
            disabled={!replyEnabled}
          >
            <SelectTrigger
              className={`w-20 h-7 ${replyEnabled ? sqlKeyword : 'text-neutral-400'}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">TRUE</SelectItem>
              <SelectItem value="false">FALSE</SelectItem>
            </SelectContent>
          </Select>
          {replyEnabled && (
            <label className="flex items-center gap-1 text-xs text-neutral-500 cursor-pointer">
              <input
                type="checkbox"
                checked={replyNegate}
                onChange={(e) => onReplyNegateChange(e.target.checked)}
                className="w-3 h-3"
              />
              NOT
            </label>
          )}
        </div>

        {/* thread_id NOT IN 조건 */}
        <div className="ml-4 mt-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={threadEnabled}
              onCheckedChange={(checked) =>
                onThreadEnabledChange(checked === true)
              }
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <span
              className={
                threadEnabled
                  ? 'text-neutral-800 dark:text-neutral-200'
                  : 'text-neutral-600 dark:text-neutral-400'
              }
            >
              thread_id
            </span>
            <span className={threadEnabled ? sqlKeyword : 'text-neutral-400'}>
              NOT IN
            </span>
            <span
              className={
                threadEnabled
                  ? 'text-neutral-800 dark:text-neutral-200'
                  : 'text-neutral-400'
              }
            >
              (
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  보존할 쓰레드의 시작 트윗 ID입니다. 해당 쓰레드에 속한 모든
                  트윗이 삭제 대상에서 제외됩니다.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {threadEnabled && (
            <div className="ml-8 mt-2 space-y-2">
              {threads.length > 0 && (
                <Select onValueChange={handleSelectThread}>
                  <SelectTrigger className="h-7 bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200">
                    <SelectValue placeholder="쓰레드 선택..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 max-h-60">
                    {threads.map((thread) => (
                      <SelectItem
                        key={thread.id}
                        value={thread.id}
                        disabled={excludedThreadIds.includes(thread.id)}
                        className="text-neutral-800 dark:text-neutral-200 focus:bg-neutral-100 dark:focus:bg-neutral-700"
                      >
                        <div className="truncate max-w-[250px]">
                          <span className="text-neutral-500 text-xs mr-2">
                            {new Date(thread.createdAt).toLocaleDateString()}
                          </span>
                          {thread.text.slice(0, 50)}
                          {thread.text.length > 50 && '...'}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="URL 또는 트윗 ID 직접 입력"
                  value={threadInput}
                  onChange={(e) => {
                    setThreadInput(e.target.value);
                    setThreadError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddThreadId();
                    }
                  }}
                  className="flex-1 h-7 bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400"
                />
                <Button
                  size="sm"
                  onClick={handleAddThreadId}
                  className="h-7 bg-blue-600 hover:bg-blue-500"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {threadError && (
                <p className="text-red-500 dark:text-red-400 text-xs">
                  {threadError}
                </p>
              )}
              {excludedThreadIds.map((id) => {
                const thread = tweets.find((t) => t.id === id);
                return (
                  <div
                    key={id}
                    className={`flex items-center gap-2 ${sqlString}`}
                  >
                    <span className="truncate flex-1">
                      • {id}
                      {thread && (
                        <span className="text-neutral-500 ml-2 text-xs">
                          ({thread.text.slice(0, 30)}
                          {thread.text.length > 30 && '...'})
                        </span>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemoveThreadId(id)}
                      className="h-5 w-5 hover:text-red-500 hover:bg-transparent flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          <span
            className={
              threadEnabled
                ? 'ml-4 text-neutral-800 dark:text-neutral-200'
                : 'ml-4 text-neutral-400'
            }
          >
            )
          </span>
        </div>

        {/* created_at BETWEEN 조건 */}
        <div className="ml-4 mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Checkbox
              checked={dateRangeEnabled}
              onCheckedChange={(checked) =>
                onDateRangeEnabledChange(checked === true)
              }
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <span
              className={
                dateRangeEnabled
                  ? 'text-neutral-800 dark:text-neutral-200'
                  : 'text-neutral-600 dark:text-neutral-400'
              }
            >
              created_at
            </span>
            <span
              className={dateRangeEnabled ? sqlKeyword : 'text-neutral-400'}
            >
              BETWEEN
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  지정된 기간 내의 트윗만 삭제 대상이 됩니다. 시작일 또는
                  종료일을 비워두면 해당 방향으로 제한 없이 적용됩니다.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {dateRangeEnabled && (
            <div className="ml-8 mt-2 flex items-center gap-2 flex-wrap">
              <Input
                type="date"
                value={startDate || ''}
                onChange={(e) => onStartDateChange(e.target.value || null)}
                className={`w-40 h-7 bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 ${sqlString}`}
              />
              <span className={sqlKeyword}>AND</span>
              <Input
                type="date"
                value={endDate || ''}
                onChange={(e) => onEndDateChange(e.target.value || null)}
                className={`w-40 h-7 bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 ${sqlString}`}
              />
            </div>
          )}
        </div>

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
            {showConnector && ` (${combineMode} 조합)`}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
