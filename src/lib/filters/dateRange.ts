import type { Tweet, TweetFilter } from '@/types';

/**
 * 날짜 범위 기준 보존 필터: 지정된 범위 밖의 트윗을 보존
 * (범위 안의 트윗이 삭제 대상이 됨)
 */
export function createDateRangeFilter(
  startDate: string | null,
  endDate: string | null,
): TweetFilter {
  return {
    id: 'dateRange',
    type: 'dateRange',
    enabled: true,
    apply: (tweets: Tweet[]) => {
      // 범위가 지정되지 않으면 전체 보존 (삭제 대상 없음)
      if (!startDate && !endDate) {
        return tweets;
      }

      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      // 시작일은 해당 일자의 시작(00:00:00.000)으로 설정
      if (start) {
        start.setHours(0, 0, 0, 0);
      }

      // 종료일은 해당 일자의 끝(23:59:59.999)으로 설정
      if (end) {
        end.setHours(23, 59, 59, 999);
      }

      return tweets.filter((t) => {
        const tweetDate = new Date(t.createdAt);

        // 범위 밖이면 보존 (범위 안이면 삭제 대상)
        if (start && tweetDate < start) return true;
        if (end && tweetDate > end) return true;

        return false;
      });
    },
  };
}
