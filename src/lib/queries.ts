'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import {
  deleteBatch,
  fetchTweets,
  parseArchive,
  saveBackup,
  verifyAuth,
} from '@/lib/ipc';
import type { Tweet, TwitterAuth } from '@/types';

export function useVerifyAuth() {
  return useMutation({
    mutationFn: (auth: TwitterAuth) => verifyAuth(auth),
  });
}

export function useFetchTweets(cursor?: string) {
  return useQuery({
    queryKey: ['tweets', cursor],
    queryFn: () => fetchTweets(cursor),
    enabled: false, // 수동 트리거
  });
}

export function useParseArchive() {
  return useMutation({
    mutationFn: () => parseArchive(),
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
