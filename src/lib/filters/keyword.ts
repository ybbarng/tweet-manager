import type { Tweet, TweetFilter } from '@/types';
import type { KeywordFilterConfig } from './types';
import { applyNegate } from './types';

/** 키워드 필터 생성 */
export function createKeywordFilter(config: KeywordFilterConfig): TweetFilter {
  const { keywords, matchMode, caseSensitive, negate } = config;

  return {
    id: 'keyword',
    type: 'keyword',
    enabled: true,
    apply: (tweets: Tweet[]) => {
      if (keywords.length === 0) {
        // 키워드가 없으면 전체 보존
        return negate ? [] : tweets;
      }

      const kept = tweets.filter((t) => {
        const text = caseSensitive ? t.text : t.text.toLowerCase();
        const searchKeywords = caseSensitive
          ? keywords
          : keywords.map((k) => k.toLowerCase());

        if (matchMode === 'all') {
          // 모든 키워드 포함
          return searchKeywords.every((k) => text.includes(k));
        }
        // any: 하나라도 포함
        return searchKeywords.some((k) => text.includes(k));
      });

      return applyNegate(kept, tweets, negate);
    },
  };
}
