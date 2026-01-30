import type { Tweet, TweetFilter } from '@/types';

/**
 * 시작일 필터: 시작일 이후 트윗을 삭제 대상으로 반환
 */
export function createStartDateFilter(startDate: string): TweetFilter {
  return {
    id: 'startDate',
    type: 'startDate',
    enabled: true,
    apply: (tweets: Tweet[]) => {
      const start = new Date(startDate);
      // 시작일은 해당 일자의 시작(00:00:00.000)으로 설정
      start.setHours(0, 0, 0, 0);

      return tweets.filter((t) => {
        const tweetDate = new Date(t.createdAt);
        return tweetDate >= start;
      });
    },
  };
}

/**
 * 종료일 필터: 종료일 이전 트윗을 삭제 대상으로 반환
 */
export function createEndDateFilter(endDate: string): TweetFilter {
  return {
    id: 'endDate',
    type: 'endDate',
    enabled: true,
    apply: (tweets: Tweet[]) => {
      const end = new Date(endDate);
      // 종료일은 해당 일자의 끝(23:59:59.999)으로 설정
      end.setHours(23, 59, 59, 999);

      return tweets.filter((t) => {
        const tweetDate = new Date(t.createdAt);
        return tweetDate <= end;
      });
    },
  };
}
