import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

/** 날짜만 표시 (예: 2024. 1. 15.) */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy. M. d.', { locale: ko });
}

/** 날짜 + 시간 표시 (예: 2024. 1. 15. 오후 3:30) */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy. M. d. a h:mm', { locale: ko });
}

/** 연월만 표시 (예: 2024년 1월) */
export function formatYearMonth(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy년 M월', { locale: ko });
}
