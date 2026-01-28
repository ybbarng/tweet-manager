'use client';

import { useState } from 'react';
import { useAppState, useAppDispatch } from '@/lib/store/tweet-store';
import { useParseArchive } from '@/lib/queries';
import { fetchTweets, isElectron } from '@/lib/ipc';
import type { Tweet } from '@/types';
import { Upload, Download } from 'lucide-react';

export default function ArchiveUpload() {
  const { user } = useAppState();
  const dispatch = useAppDispatch();
  const archiveMutation = useParseArchive();
  const [apiLoading, setApiLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleArchiveUpload = () => {
    if (!isElectron()) return;
    setError('');
    setLoadingMessage('아카이브 파일을 파싱하고 있습니다...');

    archiveMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.success && result.data) {
          const tweets = result.data.map((t: Tweet) => ({
            ...t,
            createdAt: new Date(t.createdAt),
          }));
          dispatch({ type: 'SET_TWEETS', payload: tweets });
          dispatch({ type: 'SET_STEP', payload: 'filter' });
        } else {
          setError(result.error || '아카이브 파싱에 실패했습니다.');
        }
        setLoadingMessage('');
      },
      onError: (err) => {
        setError(err.message);
        setLoadingMessage('');
      },
    });
  };

  const handleApiLoad = async () => {
    if (!isElectron()) return;
    setApiLoading(true);
    setError('');
    setLoadingMessage('트윗을 불러오고 있습니다...');

    try {
      const allTweets: Tweet[] = [];
      let cursor: string | undefined;

      while (true) {
        const result = await fetchTweets(cursor);
        if (!result.success || !result.data) {
          if (allTweets.length === 0) {
            setError(result.error || '트윗 조회에 실패했습니다.');
          }
          break;
        }

        const tweets = result.data.tweets.map((t: Tweet) => ({
          ...t,
          createdAt: new Date(t.createdAt),
        }));
        allTweets.push(...tweets);
        setLoadingMessage(`트윗을 불러오고 있습니다... (${allTweets.length}개)`);

        cursor = result.data.nextCursor;
        if (!cursor || tweets.length === 0) break;
      }

      if (allTweets.length > 0) {
        dispatch({ type: 'SET_TWEETS', payload: allTweets });
        dispatch({ type: 'SET_STEP', payload: 'filter' });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setApiLoading(false);
      setLoadingMessage('');
    }
  };

  const loading = archiveMutation.isPending || apiLoading;

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-2">트윗 불러오기</h2>
      {user && (
        <p className="text-neutral-500 mb-6">@{user.screenName} 계정의 트윗을 불러옵니다.</p>
      )}

      <div className="space-y-4">
        <button
          onClick={handleArchiveUpload}
          disabled={loading}
          className="w-full flex items-center gap-3 p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors disabled:opacity-50"
        >
          <Upload className="w-8 h-8 text-blue-500" />
          <div className="text-left">
            <p className="font-semibold">아카이브 파일 업로드 (추천)</p>
            <p className="text-sm text-neutral-500">
              X 설정에서 다운로드한 아카이브의 tweets.js 파일을 선택합니다
            </p>
          </div>
        </button>

        <button
          onClick={handleApiLoad}
          disabled={loading}
          className="w-full flex items-center gap-3 p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors disabled:opacity-50"
        >
          <Download className="w-8 h-8 text-green-500" />
          <div className="text-left">
            <p className="font-semibold">API로 가져오기</p>
            <p className="text-sm text-neutral-500">
              Twitter API를 통해 트윗을 가져옵니다 (시간이 걸릴 수 있습니다)
            </p>
          </div>
        </button>
      </div>

      {loading && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-sm text-blue-600 dark:text-blue-400">{loadingMessage}</p>
        </div>
      )}

      {error && (
        <p className="mt-4 text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
}
