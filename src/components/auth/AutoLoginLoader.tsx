'use client';

import { useMemo } from 'react';
import { getRandomTaglineIndex, taglines } from '@/lib/taglines';

interface AutoLoginLoaderProps {
  error?: string | null;
}

export default function AutoLoginLoader({ error }: AutoLoginLoaderProps) {
  const tagline = useMemo(() => taglines[getRandomTaglineIndex()], []);

  return (
    <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[400px] text-center">
      <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 italic">
        "{tagline}"
      </p>

      {error ? (
        <div className="text-red-500">
          <svg
            className="w-12 h-12 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-label="경고 아이콘"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        <>
          <div className="w-8 h-8 border-2 border-neutral-300 dark:border-neutral-600 border-t-blue-500 rounded-full animate-spin mb-4" />
          <p className="text-sm text-neutral-500">자동 로그인 중...</p>
        </>
      )}
    </div>
  );
}
