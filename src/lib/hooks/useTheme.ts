'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ThemeMode } from '@/types';

const STORAGE_KEY = 'theme-mode';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;

  const effectiveTheme = mode === 'system' ? getSystemTheme() : mode;
  if (effectiveTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>('system');

  // 초기화: localStorage에서 저장된 값 로드
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (stored && ['system', 'light', 'dark'].includes(stored)) {
      setMode(stored);
      applyTheme(stored);
    }
  }, []);

  // 시스템 테마 변경 감지 (system 모드일 때만 반응)
  useEffect(() => {
    if (mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [mode]);

  const setTheme = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
    applyTheme(newMode);
  }, []);

  // 순환 토글: system → light → dark → system
  const cycleTheme = useCallback(() => {
    const next: ThemeMode =
      mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    setTheme(next);
  }, [mode, setTheme]);

  return { mode, setTheme, cycleTheme };
}
