'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAppState, useAppDispatch } from '@/lib/store/tweet-store';
import { createLikesFilter } from '@/lib/filters/likes';
import { createRetweetsFilter } from '@/lib/filters/retweets';
import { createThreadFilter } from '@/lib/filters/thread';
import { getTweetsToDelete } from '@/lib/filters/engine';
import LikesFilter from './LikesFilter';
import RetweetsFilter from './RetweetsFilter';
import ThreadFilter from './ThreadFilter';
import TweetStats from '../tweets/TweetStats';

export default function FilterPanel() {
  const { tweets } = useAppState();
  const dispatch = useAppDispatch();

  const [likesEnabled, setLikesEnabled] = useState(false);
  const [minLikes, setMinLikes] = useState(5);
  const [retweetsEnabled, setRetweetsEnabled] = useState(false);
  const [minRetweets, setMinRetweets] = useState(3);
  const [threadEnabled, setThreadEnabled] = useState(false);
  const [threadIds, setThreadIds] = useState<string[]>([]);

  const filters = useMemo(() => {
    const f = [];
    if (likesEnabled) f.push(createLikesFilter(minLikes));
    if (retweetsEnabled) f.push(createRetweetsFilter(minRetweets));
    if (threadEnabled && threadIds.length > 0) f.push(createThreadFilter(threadIds));
    return f;
  }, [likesEnabled, minLikes, retweetsEnabled, minRetweets, threadEnabled, threadIds]);

  const toDelete = useMemo(
    () => getTweetsToDelete(tweets, filters, new Set()),
    [tweets, filters],
  );

  const handleApply = useCallback(() => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
    dispatch({ type: 'SET_STEP', payload: 'preview' });
  }, [dispatch, filters]);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">필터 설정</h2>
      <p className="text-neutral-500 mb-6">
        보존할 트윗의 조건을 설정합니다. 조건에 해당하지 않는 트윗이 삭제 대상이 됩니다.
      </p>

      <TweetStats
        total={tweets.length}
        toDelete={toDelete.length}
        preserved={tweets.length - toDelete.length}
      />

      <div className="space-y-3 mb-6">
        <LikesFilter
          minLikes={minLikes}
          onChange={setMinLikes}
          enabled={likesEnabled}
          onToggle={() => setLikesEnabled(v => !v)}
        />
        <RetweetsFilter
          minRetweets={minRetweets}
          onChange={setMinRetweets}
          enabled={retweetsEnabled}
          onToggle={() => setRetweetsEnabled(v => !v)}
        />
        <ThreadFilter
          preservedIds={threadIds}
          onChange={setThreadIds}
          enabled={threadEnabled}
          onToggle={() => setThreadEnabled(v => !v)}
        />
      </div>

      <button
        onClick={handleApply}
        disabled={filters.length === 0}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-400 text-white rounded-lg font-medium transition-colors"
      >
        {filters.length === 0
          ? '하나 이상의 필터를 활성화해주세요'
          : `삭제 대상 ${toDelete.length.toLocaleString()}개 미리보기`
        }
      </button>
    </div>
  );
}
