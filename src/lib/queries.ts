'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { deleteBatch, fetchTweets, saveBackup } from '@/lib/ipc';
import type { Tweet } from '@/types';

export function useFetchTweets(cursor?: string) {
  return useQuery({
    queryKey: ['tweets', cursor],
    queryFn: () => fetchTweets(cursor),
    enabled: false, // 수동 트리거
  });
}

export function useDeleteBatch() {
  return useMutation({
    mutationFn: (tweetIds: string[]) => deleteBatch(tweetIds),
  });
}

export function useSaveBackup() {
  return useMutation({
    mutationFn: (tweets: Tweet[]) =>
      saveBackup(JSON.stringify(tweets, null, 2)),
  });
}
