'use client';

import { Plus, X } from 'lucide-react';
import { useState } from 'react';
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

export interface QueryBuilderProps {
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

export default function QueryBuilder({
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

  const handleRemoveThreadId = (id: string) => {
    onExcludedThreadIdsChange(excludedThreadIds.filter((tid) => tid !== id));
  };

  const handleLimitChange = (value: string) => {
    if (value === 'all') {
      onLimitChange(null);
    } else {
      onLimitChange(Number.parseInt(value, 10));
    }
  };

  // 활성화된 조건이 있는지 확인
  const hasActiveConditions = likesEnabled || retweetsEnabled || threadEnabled;

  return (
    <div className="font-mono text-sm bg-neutral-900 text-green-400 p-4 rounded-lg">
      <div className="text-neutral-500">DELETE FROM tweets WHERE</div>

      {/* likes 조건 */}
      <div className="ml-4 mt-3 flex items-center gap-2">
        <Checkbox
          checked={likesEnabled}
          onCheckedChange={(checked) => onLikesEnabledChange(checked === true)}
          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
        />
        <span className={likesEnabled ? '' : 'text-neutral-600'}>
          likes &lt;
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
          className="w-20 h-7 bg-neutral-800 border-neutral-700 text-green-400 disabled:text-neutral-600"
        />
      </div>

      {/* AND */}
      {likesEnabled && (retweetsEnabled || threadEnabled) && (
        <div className="text-neutral-500 ml-4 mt-1">AND</div>
      )}

      {/* retweets 조건 */}
      <div className="ml-4 mt-1 flex items-center gap-2">
        <Checkbox
          checked={retweetsEnabled}
          onCheckedChange={(checked) =>
            onRetweetsEnabledChange(checked === true)
          }
          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
        />
        <span className={retweetsEnabled ? '' : 'text-neutral-600'}>
          retweets &lt;
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
          className="w-20 h-7 bg-neutral-800 border-neutral-700 text-green-400 disabled:text-neutral-600"
        />
      </div>

      {/* AND */}
      {(likesEnabled || retweetsEnabled) && threadEnabled && (
        <div className="text-neutral-500 ml-4 mt-1">AND</div>
      )}

      {/* thread_id NOT IN 조건 */}
      <div className="ml-4 mt-1">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={threadEnabled}
            onCheckedChange={(checked) =>
              onThreadEnabledChange(checked === true)
            }
            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
          />
          <span className={threadEnabled ? '' : 'text-neutral-600'}>
            thread_id NOT IN (
          </span>
        </div>
        {threadEnabled && (
          <div className="ml-8 mt-2 space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="URL 또는 트윗 ID"
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
                className="flex-1 h-7 bg-neutral-800 border-neutral-700 text-green-400 placeholder:text-neutral-600"
              />
              <Button
                size="sm"
                onClick={handleAddThreadId}
                className="h-7 bg-green-700 hover:bg-green-600"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {threadError && (
              <p className="text-red-400 text-xs">{threadError}</p>
            )}
            {excludedThreadIds.map((id) => (
              <div key={id} className="flex items-center gap-2 text-yellow-400">
                <span>• {id}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleRemoveThreadId(id)}
                  className="h-5 w-5 hover:text-red-400 hover:bg-transparent"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <span className={`ml-4 ${threadEnabled ? '' : 'text-neutral-600'}`}>
          )
        </span>
      </div>

      {/* LIMIT */}
      <div className="mt-4 flex items-center gap-2">
        <span>LIMIT</span>
        <Select
          value={limit === null ? 'all' : String(limit)}
          onValueChange={handleLimitChange}
        >
          <SelectTrigger className="w-24 h-7 bg-neutral-800 border-neutral-700 text-green-400">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-neutral-800 border-neutral-700">
            <SelectItem
              value="all"
              className="text-green-400 focus:bg-neutral-700 focus:text-green-400"
            >
              전체
            </SelectItem>
            <SelectItem
              value="50"
              className="text-green-400 focus:bg-neutral-700 focus:text-green-400"
            >
              50
            </SelectItem>
            <SelectItem
              value="100"
              className="text-green-400 focus:bg-neutral-700 focus:text-green-400"
            >
              100
            </SelectItem>
            <SelectItem
              value="500"
              className="text-green-400 focus:bg-neutral-700 focus:text-green-400"
            >
              500
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 결과 */}
      <div className="mt-4 pt-4 border-t border-neutral-700">
        <span className="text-yellow-400">
          -- 결과:{' '}
          {hasActiveConditions
            ? `${resultCount.toLocaleString()}개 삭제 후보`
            : '조건을 선택하세요'}
        </span>
      </div>
    </div>
  );
}
