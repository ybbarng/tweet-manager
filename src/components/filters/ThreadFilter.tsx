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
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store/app-store';
import type { Tweet } from '@/types';
import { fieldTextStyle, filterLabel, sqlKeyword, sqlString } from './styles';

/** 트윗 URL에서 ID를 추출 */
function extractTweetId(input: string): string | null {
  const urlMatch = input.match(/(?:twitter|x)\.com\/\w+\/status\/(\d+)/);
  if (urlMatch) return urlMatch[1];
  if (/^\d+$/.test(input.trim())) return input.trim();
  return null;
}

export default function ThreadFilter() {
  const { tweets, filterState, setThreadEnabled, setThreadExcludedIds } =
    useAppStore();

  const { enabled, excludedIds } = filterState.thread;

  const [threadInput, setThreadInput] = useState('');
  const [threadError, setThreadError] = useState('');

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
    if (excludedIds.includes(id)) {
      setThreadError('이미 추가된 ID입니다.');
      return;
    }
    setThreadExcludedIds([...excludedIds, id]);
    setThreadInput('');
    setThreadError('');
  };

  const handleSelectThread = (id: string) => {
    if (!excludedIds.includes(id)) {
      setThreadExcludedIds([...excludedIds, id]);
    }
  };

  const handleRemoveThreadId = (id: string) => {
    setThreadExcludedIds(excludedIds.filter((tid) => tid !== id));
  };

  return (
    <div className="ml-4 mt-3">
      <div className="flex items-center gap-2">
        <span className={filterLabel}>타래</span>
        <Checkbox
          checked={enabled}
          onCheckedChange={(checked) => setThreadEnabled(checked === true)}
          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
        />
        <span className={fieldTextStyle(enabled)}>thread_id</span>
        <span className={enabled ? sqlKeyword : 'text-neutral-400'}>
          NOT IN
        </span>
        <span className={fieldTextStyle(enabled)}>(</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="w-4 h-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>
              보존할 쓰레드의 시작 트윗 ID입니다. 해당 쓰레드에 속한 모든 트윗이
              삭제 대상에서 제외됩니다.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      {enabled && (
        <div className="ml-20 mt-2 space-y-2">
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
                    disabled={excludedIds.includes(thread.id)}
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
          {excludedIds.map((id) => {
            const thread = tweets.find((t) => t.id === id);
            return (
              <div key={id} className={`flex items-center gap-2 ${sqlString}`}>
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
      <span className={`${fieldTextStyle(enabled)} ml-16`}>)</span>
    </div>
  );
}
