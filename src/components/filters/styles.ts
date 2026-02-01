/** SQL 키워드 스타일 클래스 */
export const sqlKeyword = 'text-blue-600 dark:text-blue-400 font-semibold';
export const sqlOperator = 'text-cyan-600 dark:text-cyan-400 font-semibold';
export const sqlComment = 'text-neutral-500 dark:text-neutral-400';
export const sqlString = 'text-orange-500 dark:text-orange-400';
export const sqlNumber = 'text-green-600 dark:text-green-400';
export const filterLabel =
  'text-neutral-400 dark:text-neutral-500 text-xs w-16';

/** 필드 활성화 상태에 따른 텍스트 스타일 */
export function fieldTextStyle(enabled: boolean): string {
  return enabled
    ? 'text-neutral-800 dark:text-neutral-200'
    : 'text-neutral-600 dark:text-neutral-400';
}

/** 입력 필드 스타일 */
export function inputStyle(enabled: boolean, colorClass: string): string {
  return enabled
    ? `${colorClass} bg-white dark:bg-neutral-800`
    : 'text-neutral-400 bg-neutral-50 dark:bg-neutral-900';
}
