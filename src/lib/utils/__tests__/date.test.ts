import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatYearMonth } from '../date';

describe('date utils', () => {
  const testDate = new Date('2024-03-15T14:30:00');

  describe('formatDate', () => {
    it('Date 객체를 날짜 문자열로 포맷한다', () => {
      expect(formatDate(testDate)).toBe('2024. 3. 15.');
    });

    it('ISO 문자열을 날짜 문자열로 포맷한다', () => {
      expect(formatDate('2024-03-15T14:30:00')).toBe('2024. 3. 15.');
    });
  });

  describe('formatDateTime', () => {
    it('Date 객체를 날짜+시간 문자열로 포맷한다', () => {
      expect(formatDateTime(testDate)).toBe('2024. 3. 15. 오후 2:30');
    });

    it('ISO 문자열을 날짜+시간 문자열로 포맷한다', () => {
      expect(formatDateTime('2024-03-15T14:30:00')).toBe(
        '2024. 3. 15. 오후 2:30',
      );
    });
  });

  describe('formatYearMonth', () => {
    it('Date 객체를 연월 문자열로 포맷한다', () => {
      expect(formatYearMonth(testDate)).toBe('2024년 3월');
    });

    it('ISO 문자열을 연월 문자열로 포맷한다', () => {
      expect(formatYearMonth('2024-03-15T14:30:00')).toBe('2024년 3월');
    });
  });
});
