import type { UserTweetsResponse, TweetResult, VerifyCredentialsResponse } from './types';

export interface ParsedTweet {
  id: string;
  text: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
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

/** verify_credentials 응답에서 사용자 정보 추출 */
export function parseVerifyCredentials(data: VerifyCredentialsResponse): ParsedUser {
  return {
    id: data.id_str,
    name: data.name,
    screenName: data.screen_name,
    profileImageUrl: data.profile_image_url_https,
  };
}

/** UserTweets GraphQL 응답에서 트윗 목록과 다음 커서 추출 */
export function parseTimelineResponse(data: UserTweetsResponse): FetchTweetsResult {
  const tweets: ParsedTweet[] = [];
  let nextCursor: string | undefined;

  const instructions = data.data.user.result.timeline_v2.timeline.instructions;

  for (const instruction of instructions) {
    if (!instruction.entries) continue;

    for (const entry of instruction.entries) {
      if (entry.content.cursorType === 'Bottom') {
        nextCursor = entry.content.value;
        continue;
      }

      const tweetResult = entry.content.itemContent?.tweet_results?.result;
      if (!tweetResult) continue;

      const parsed = parseTweetResult(tweetResult);
      if (parsed) {
        tweets.push(parsed);
      }
    }
  }

  return { tweets, nextCursor };
}

/** 개별 TweetResult에서 필요한 필드 추출 */
export function parseTweetResult(result: TweetResult): ParsedTweet | null {
  try {
    const legacy = result.legacy;
    return {
      id: result.rest_id,
      text: legacy.full_text,
      createdAt: legacy.created_at,
      likes: legacy.favorite_count,
      retweets: legacy.retweet_count,
      replies: legacy.reply_count,
      inReplyToId: legacy.in_reply_to_status_id_str,
      conversationId: legacy.conversation_id_str,
      isRetweet: !!legacy.retweeted_status_result,
      media: legacy.entities?.media?.map(m => ({
        type: m.type,
        url: m.media_url_https,
      })),
    };
  } catch {
    return null;
  }
}
