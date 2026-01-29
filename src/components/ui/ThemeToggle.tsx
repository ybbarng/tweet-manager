'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';

export function ThemeToggle() {
  const { mode, cycleTheme } = useTheme();

  const Icon = mode === 'system' ? Monitor : mode === 'light' ? Sun : Moon;
  const label =
    mode === 'system' ? '시스템' : mode === 'light' ? '라이트' : '다크';

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="flex items-center gap-1.5 px-2 py-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      title={`테마: ${label} (클릭하여 변경)`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-xs hidden sm:inline">{label}</span>
    </button>
  );
}
