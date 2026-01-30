import { logger } from '../utils/logger';
import type { TweetResult, UserTweetsResponse, ViewerResponse } from './types';

export interface ParsedTweet {
  id: string;
  text: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
  views?: number;
  inReplyToId?: string;
  conversationId?: string;
  isRetweet: boolean;
  media?: { type: string; url: string }[];
}

export interface FetchTweetsResult {
  tweets: ParsedTweet[];
  nextCursor?: string;
}

export interface ParsedUser {
  id: string;
  name: string;
  screenName: string;
  profileImageUrl: string;
}

/** GraphQL Viewer 응답에서 사용자 정보 추출 */
export function parseViewer(data: ViewerResponse): ParsedUser {
  const user = data.data.viewer.user_results.result;
  return {
    id: user.rest_id,
    name: user.legacy.name,
    screenName: user.legacy.screen_name,
    profileImageUrl: user.legacy.profile_image_url_https,
  };
}

/** UserTweets GraphQL 응답에서 트윗 목록과 다음 커서 추출 */
export function parseTimelineResponse(
  data: UserTweetsResponse,
): FetchTweetsResult {
  const tweets: ParsedTweet[] = [];
  let nextCursor: string | undefined;

  const instructions = data.data.user.result.timeline_v2.timeline.instructions;

  for (const instruction of instructions) {
    if (!instruction.entries) continue;

    for (const entry of instruction.entries) {
      // 커서 처리
      if (entry.content.cursorType === 'Bottom') {
        nextCursor = entry.content.value;
        continue;
      }

      // 일반 트윗 (TimelineTimelineItem)
      if (entry.content.itemContent?.tweet_results?.result) {
        const tweetResult = entry.content.itemContent.tweet_results.result;
        const parsed = parseTweetResultWithWrapper(tweetResult);
        if (parsed) {
          tweets.push(parsed);
        }
        continue;
      }

      // 쓰레드 모듈 (TimelineTimelineModule) - items 배열 안에 여러 트윗
      // biome-ignore lint/suspicious/noExplicitAny: Twitter API 응답 타입이 복잡하여 any 사용
      const items = (entry.content as any).items;
      if (Array.isArray(items)) {
        for (const item of items) {
          const tweetResult = item.item?.itemContent?.tweet_results?.result;
          if (tweetResult) {
            const parsed = parseTweetResultWithWrapper(tweetResult);
            if (parsed) {
              tweets.push(parsed);
            }
          }
        }
      }
    }
  }

  return { tweets, nextCursor };
}

/** TweetWithVisibilityResults 등 래퍼 타입 처리 */
// biome-ignore lint/suspicious/noExplicitAny: Twitter API 응답 타입이 복잡하여 any 사용
function parseTweetResultWithWrapper(result: any): ParsedTweet | null {
  // TweetWithVisibilityResults 래퍼 처리
  if (result.__typename === 'TweetWithVisibilityResults' && result.tweet) {
    return parseTweetResult(result.tweet);
  }

  // TweetUnavailable 처리 (삭제됨, 비공개 등)
  if (result.__typename === 'TweetUnavailable') {
    logger.log('[parser] TweetUnavailable 스킵:', result.reason);
    return null;
  }

  // TweetTombstone 처리 (규칙 위반 등으로 숨겨진 트윗)
  if (result.__typename === 'TweetTombstone') {
    logger.log('[parser] TweetTombstone 스킵');
    return null;
  }

  // 일반 Tweet
  return parseTweetResult(result as TweetResult);
}

/** 개별 TweetResult에서 필요한 필드 추출 */
export function parseTweetResult(result: TweetResult): ParsedTweet | null {
  try {
    const legacy = result.legacy;
    if (!legacy) {
      logger.log('[parser] legacy 필드 없음:', result);
      return null;
    }

    // views 파싱 (문자열 → 숫자)
    const viewsCount = result.views?.count;
    const views = viewsCount ? parseInt(viewsCount, 10) : undefined;

    return {
      id: result.rest_id,
      text: legacy.full_text,
      createdAt: legacy.created_at,
      likes: legacy.favorite_count,
      retweets: legacy.retweet_count,
      replies: legacy.reply_count,
      views: Number.isNaN(views) ? undefined : views,
      inReplyToId: legacy.in_reply_to_status_id_str,
      conversationId: legacy.conversation_id_str,
      isRetweet: !!legacy.retweeted_status_result,
      media: legacy.entities?.media?.map((m) => ({
        type: m.type,
        url: m.media_url_https,
      })),
    };
  } catch (err) {
    logger.error('[parser] parseTweetResult 에러:', err, result);
    return null;
  }
}
