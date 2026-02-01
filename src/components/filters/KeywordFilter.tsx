'use client';

import { HelpCircle, Plus, X } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  fieldTextStyle,
  filterLabel,
  sqlKeyword,
  sqlOperator,
  sqlString,
} from './styles';

export interface KeywordFilterProps {
  enabled: boolean;
  keywords: string[];
  matchMode: 'any' | 'all';
  negate: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onKeywordsChange: (keywords: string[]) => void;
  onMatchModeChange: (mode: 'any' | 'all') => void;
  onNegateChange: (negate: boolean) => void;
}

/** NOT 버튼 컴포넌트 */
function NotButton({
  active,
  onClick,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-1.5 py-0.5 rounded text-xs font-semibold transition-all ${
        active
          ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
          : 'text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 dark:hover:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      NOT
    </button>
  );
}

export default function KeywordFilter({
  enabled,
  keywords,
  matchMode,
  negate,
  onEnabledChange,
  onKeywordsChange,
  onMatchModeChange,
  onNegateChange,
}: KeywordFilterProps) {
  const [keywordInput, setKeywordInput] = useState('');

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

  return (
    <div className="ml-4 mt-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={filterLabel}>키워드</span>
        <Checkbox
          checked={enabled}
          onCheckedChange={(checked) => onEnabledChange(checked === true)}
          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
        />
        <span className={fieldTextStyle(enabled)}>text</span>
        <NotButton
          active={negate}
          onClick={() => onNegateChange(!negate)}
          disabled={!enabled}
        />
        <span className={enabled ? sqlKeyword : 'text-neutral-400'}>
          CONTAINS
        </span>
        <Select
          value={matchMode}
          onValueChange={(v) => onMatchModeChange(v as 'any' | 'all')}
          disabled={!enabled}
        >
          <SelectTrigger
            className={`w-24 h-7 ${enabled ? sqlOperator : 'text-neutral-400'}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">ANY OF</SelectItem>
            <SelectItem value="all">ALL OF</SelectItem>
          </SelectContent>
        </Select>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="w-4 h-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>
              ANY OF: 키워드 중 하나라도 포함된 트윗
              <br />
              ALL OF: 모든 키워드가 포함된 트윗
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      {enabled && (
        <div className="ml-20 mt-2 space-y-2">
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
  );
}
