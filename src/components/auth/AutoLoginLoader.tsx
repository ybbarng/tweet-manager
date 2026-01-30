'use client';

import RandomTagline from '@/components/common/RandomTagline';

interface AutoLoginLoaderProps {
  error?: string | null;
}

export default function AutoLoginLoader({ error }: AutoLoginLoaderProps) {
  return (
    <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      {/* Twitter 로고 */}
      <div className={`mb-6 ${error ? '' : 'animate-pulse'}`}>
        <svg
          className={`w-16 h-16 ${error ? 'text-red-400' : 'text-[#1DA1F2] dark:text-[#1DA1F2]'}`}
          viewBox="0 0 24 24"
          fill="currentColor"
          role="img"
          aria-label="Twitter 로고"
        >
          <path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z" />
        </svg>
      </div>

      {/* 태그라인 */}
      <RandomTagline className="text-xl font-medium text-neutral-700 dark:text-neutral-300 mb-8" />

      {error ? (
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-full text-sm">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              role="img"
              aria-label="오류"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01"
              />
            </svg>
            {error}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 로딩 dots */}
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full animate-bounce" />
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            자동 로그인 중
          </p>
        </div>
      )}
    </div>
  );
}
