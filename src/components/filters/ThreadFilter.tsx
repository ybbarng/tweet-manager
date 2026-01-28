'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface ThreadFilterProps {
  preservedIds: string[];
  onChange: (ids: string[]) => void;
  enabled: boolean;
  onToggle: () => void;
}

/** 트윗 URL에서 ID를 추출 */
function extractTweetId(input: string): string | null {
  const urlMatch = input.match(/(?:twitter|x)\.com\/\w+\/status\/(\d+)/);
  if (urlMatch) return urlMatch[1];
  if (/^\d+$/.test(input.trim())) return input.trim();
  return null;
}

export default function ThreadFilter({ preservedIds, onChange, enabled, onToggle }: ThreadFilterProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const id = extractTweetId(input);
    if (!id) {
      setError('유효한 트윗 URL 또는 ID를 입력해주세요.');
      return;
    }
    if (preservedIds.includes(id)) {
      setError('이미 추가된 ID입니다.');
      return;
    }
    onChange([...preservedIds, id]);
    setInput('');
    setError('');
  };

  const handleRemove = (id: string) => {
    onChange(preservedIds.filter(pid => pid !== id));
  };

  return (
    <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="font-medium">특정 타래 보존</span>
        </label>
      </div>
      {enabled && (
        <>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              placeholder="트윗 URL 또는 ID 입력"
              className="flex-1 px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-900 text-sm"
            />
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              추가
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
          {preservedIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {preservedIds.map(id => (
                <span
                  key={id}
                  className="flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-xs"
                >
                  {id}
                  <button onClick={() => handleRemove(id)} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
