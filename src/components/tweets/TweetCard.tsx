'use client';

import { Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/date';
import type { Tweet } from '@/types';

interface TweetCardProps {
  tweet: Tweet;
  showCheckbox?: boolean;
  checked?: boolean;
  onToggle?: (id: string) => void;
}

export default function TweetCard({
  tweet,
  showCheckbox,
  checked,
  onToggle,
}: TweetCardProps) {
  const isExcluded = showCheckbox && checked === false;

  return (
    <div
      className={`p-4 border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${isExcluded ? 'opacity-50' : ''}`}
    >
      <div className="flex gap-3">
        {showCheckbox && (
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggle?.(tweet.id)}
            className="mt-1 w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {tweet.isRetweet && (
              <span className="text-xs text-green-500 font-medium">RT</span>
            )}
            <span className="text-xs text-neutral-500">
              {formatDateTime(tweet.createdAt)}
            </span>
          </div>

          <p className="text-sm whitespace-pre-wrap break-words">
            {tweet.text}
          </p>

          <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              {tweet.likes}
            </span>
            <span className="flex items-center gap-1">
              <Repeat2 className="w-3.5 h-3.5" />
              {tweet.retweets}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" />
              {tweet.replies}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
