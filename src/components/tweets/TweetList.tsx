'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import type { Tweet } from '@/types';
import TweetCard from './TweetCard';

interface TweetListProps {
  tweets: Tweet[];
  showCheckbox?: boolean;
  checkedIds?: Set<string>;
  onToggle?: (id: string) => void;
  /** true이면 checkedIds에 있는 트윗이 체크됨 (기본: checkedIds에 있으면 체크 해제) */
  invertChecked?: boolean;
}

export default function TweetList({
  tweets,
  showCheckbox,
  checkedIds,
  onToggle,
  invertChecked = false,
}: TweetListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tweets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 10,
  });

  if (tweets.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500">
        표시할 트윗이 없습니다.
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[500px] overflow-auto border border-neutral-200 dark:border-neutral-700 rounded-lg"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <TweetCard
              tweet={tweets[virtualRow.index]}
              showCheckbox={showCheckbox}
              checked={
                checkedIds
                  ? invertChecked
                    ? checkedIds.has(tweets[virtualRow.index].id)
                    : !checkedIds.has(tweets[virtualRow.index].id)
                  : undefined
              }
              onToggle={onToggle}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
