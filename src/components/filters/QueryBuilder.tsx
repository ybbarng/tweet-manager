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
import type { Tweet } from '@/types';

export interface QueryBuilderProps {
  tweets: Tweet[];
  likesEnabled: boolean;
  minLikes: number;
  retweetsEnabled: boolean;
  minRetweets: number;
  threadEnabled: boolean;
  excludedThreadIds: string[];
  limit: number | null;
  onLikesEnabledChange: (enabled: boolean) => void;
  onMinLikesChange: (value: number) => void;
  onRetweetsEnabledChange: (enabled: boolean) => void;
  onMinRetweetsChange: (value: number) => void;
  onThreadEnabledChange: (enabled: boolean) => void;
  onExcludedThreadIdsChange: (ids: string[]) => void;
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

export default function QueryBuilder({
  tweets,
  likesEnabled,
  minLikes,
  retweetsEnabled,
  minRetweets,
  threadEnabled,
  excludedThreadIds,
  limit,
  onLikesEnabledChange,
  onMinLikesChange,
  onRetweetsEnabledChange,
  onMinRetweetsChange,
  onThreadEnabledChange,
  onExcludedThreadIdsChange,
  onLimitChange,
  resultCount,
}: QueryBuilderProps) {
  const [threadInput, setThreadInput] = useState('');
  const [threadError, setThreadError] = useState('');
  const [customLimit, setCustomLimit] = useState('');
  const [isCustomLimit, setIsCustomLimit] = useState(false);

  // 쓰레드 목록 추출 (conversationId가 자신의 id와 같은 트윗 = 쓰레드 시작점)
  const threads = useMemo(() => {
    const threadStarts: Tweet[] = [];
    const seen = new Set<string>();

    for (const tweet of tweets) {
      if (tweet.conversationId && !seen.has(tweet.conversationId)) {
        // 같은 conversationId를 가진 트윗이 2개 이상이면 쓰레드
        const threadTweets = tweets.filter(
          (t) => t.conversationId === tweet.conversationId,
        );
        if (threadTweets.length >= 2) {
          // 쓰레드 시작점 찾기 (가장 오래된 트윗 또는 id === conversationId)
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

  // 활성화된 조건이 있는지 확인
  const hasActiveConditions = likesEnabled || retweetsEnabled || threadEnabled;

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

  return (
    <TooltipProvider>
      <div className="font-mono text-sm bg-neutral-100 dark:bg-neutral-900 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
        {/* DELETE FROM tweets WHERE */}
        <div>
          <span className={sqlKeyword}>DELETE</span>{' '}
          <span className={sqlKeyword}>FROM</span>{' '}
          <span className={sqlString}>tweets</span>{' '}
          <span className={sqlKeyword}>WHERE</span>
        </div>

        {/* likes 조건 */}
        <div className="ml-4 mt-3 flex items-center gap-2">
          <Checkbox
            checked={likesEnabled}
            onCheckedChange={(checked) =>
              onLikesEnabledChange(checked === true)
            }
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          <span
            className={
              likesEnabled
                ? 'text-neutral-800 dark:text-neutral-200'
                : 'text-neutral-400 dark:text-neutral-600'
            }
          >
            likes
          </span>
          <span className={likesEnabled ? sqlOperator : 'text-neutral-400'}>
            &lt;
          </span>
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
        </div>

        {/* AND */}
        {likesEnabled && (retweetsEnabled || threadEnabled) && (
          <div className={`ml-4 mt-1 ${sqlKeyword}`}>AND</div>
        )}

        {/* retweets 조건 */}
        <div className="ml-4 mt-1 flex items-center gap-2">
          <Checkbox
            checked={retweetsEnabled}
            onCheckedChange={(checked) =>
              onRetweetsEnabledChange(checked === true)
            }
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          <span
            className={
              retweetsEnabled
                ? 'text-neutral-800 dark:text-neutral-200'
                : 'text-neutral-400 dark:text-neutral-600'
            }
          >
            retweets
          </span>
          <span className={retweetsEnabled ? sqlOperator : 'text-neutral-400'}>
            &lt;
          </span>
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
        </div>

        {/* AND */}
        {(likesEnabled || retweetsEnabled) && threadEnabled && (
          <div className={`ml-4 mt-1 ${sqlKeyword}`}>AND</div>
        )}

        {/* thread_id NOT IN 조건 */}
        <div className="ml-4 mt-1">
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
                  : 'text-neutral-400 dark:text-neutral-600'
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
              {/* 쓰레드 선택 드롭다운 */}
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

              {/* 직접 입력 */}
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
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
