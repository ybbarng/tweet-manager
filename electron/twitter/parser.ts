import { logger } from '../utils/logger';
import type { TweetResult, UserTweetsResponse, ViewerResponse } from './types';

export interface ThreadInfo {
  size: number; // 쓰레드 내 트윗 수
  startTweetId: string; // 쓰레드 시작 트윗 ID
  startTweetDate: string; // 쓰레드 시작 날짜
}

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
  threadInfo?: ThreadInfo; // 쓰레드의 일부인 경우
}

export interface FetchTweetsResult {
  tweets: ParsedTweet[];
  nextCursor?: string;
  user?: ParsedUser;
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
  const retweetedOriginalIds = new Set<string>(); // 리트윗의 원본 트윗 ID
  const pinnedTweetIds = new Set<string>(); // 고정 트윗 ID (제외 대상)
  let nextCursor: string | undefined;

  const instructions = data.data.user.result.timeline_v2.timeline.instructions;

  // 1차: 고정 트윗 ID 수집 + 모든 트윗 파싱 + 리트윗 원본 ID 수집
  for (const instruction of instructions) {
    // 고정 트윗은 삭제 대상이 아니므로 제외
    // biome-ignore lint/suspicious/noExplicitAny: Twitter API 응답 타입이 복잡하여 any 사용
    const inst = instruction as any;
    if (inst.type === 'TimelinePinEntry' && inst.entry) {
      const pinnedId =
        inst.entry.content?.itemContent?.tweet_results?.result?.rest_id;
      if (pinnedId) {
        pinnedTweetIds.add(pinnedId);
        logger.log('[parser] 고정 트윗 제외:', pinnedId);
      }
      continue;
    }

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
          // 리트윗이면 원본 트윗 ID 수집
          const originalId = getRetweetedOriginalId(tweetResult);
          if (originalId) {
            retweetedOriginalIds.add(originalId);
          }
        }
        continue;
      }

      // 쓰레드 모듈 (TimelineTimelineModule) - items 배열 안에 여러 트윗
      // 가장 최근 트윗만 포함하고, 쓰레드 정보를 첨부
      // biome-ignore lint/suspicious/noExplicitAny: Twitter API 응답 타입이 복잡하여 any 사용
      const items = (entry.content as any).items;
      if (Array.isArray(items) && items.length > 0) {
        // 쓰레드 내 모든 트윗 파싱
        const threadTweets: { parsed: ParsedTweet; result: unknown }[] = [];
        for (const item of items) {
          const tweetResult = item.item?.itemContent?.tweet_results?.result;
          if (tweetResult) {
            const parsed = parseTweetResultWithWrapper(tweetResult);
            if (parsed) {
              threadTweets.push({ parsed, result: tweetResult });
            }
          }
        }

        if (threadTweets.length > 0) {
          // 날짜순 정렬 (오래된 것 → 최신)
          threadTweets.sort(
            (a, b) =>
              new Date(a.parsed.createdAt).getTime() -
              new Date(b.parsed.createdAt).getTime(),
          );

          const oldest = threadTweets[0];
          const newest = threadTweets[threadTweets.length - 1];

          // 가장 최근 트윗에만 쓰레드 정보 첨부
          // 최초 트윗은 제외 (나중에 일반 트윗으로 로드될 때 처리)
          if (newest.parsed.id !== oldest.parsed.id) {
            newest.parsed.threadInfo = {
              size: threadTweets.length,
              startTweetId: oldest.parsed.id,
              startTweetDate: oldest.parsed.createdAt,
            };
            tweets.push(newest.parsed);

            // 리트윗이면 원본 트윗 ID 수집
            const originalId = getRetweetedOriginalId(newest.result);
            if (originalId) {
              retweetedOriginalIds.add(originalId);
            }

            logger.log(
              `[parser] 쓰레드 처리: ${threadTweets.length}개 중 최신만 포함 (시작: ${oldest.parsed.id})`,
            );
          } else {
            // 쓰레드가 1개뿐이면 일반 트윗처럼 처리
            tweets.push(newest.parsed);
            const originalId = getRetweetedOriginalId(newest.result);
            if (originalId) {
              retweetedOriginalIds.add(originalId);
            }
          }
        }
      }
    }
  }

  // 2차: 고정 트윗 + 리트윗 원본 트윗 제외
  const filteredTweets = tweets.filter(
    (t) => !pinnedTweetIds.has(t.id) && !retweetedOriginalIds.has(t.id),
  );

  // 첫 번째 트윗에서 사용자 정보 추출
  let user: ParsedUser | undefined;
  for (const instruction of instructions) {
    if (!instruction.entries) continue;
    for (const entry of instruction.entries) {
      const userResult =
        entry.content.itemContent?.tweet_results?.result?.core?.user_results
          ?.result;
      if (userResult?.rest_id && userResult?.legacy) {
        user = {
          id: userResult.rest_id,
          name: userResult.legacy.name || '',
          screenName: userResult.legacy.screen_name || '',
          profileImageUrl: userResult.legacy.profile_image_url_https || '',
        };
        break;
      }
    }
    if (user) break;
  }

  return { tweets: filteredTweets, nextCursor, user };
}

/** 리트윗의 원본 트윗 ID 추출 */
// biome-ignore lint/suspicious/noExplicitAny: Twitter API 응답 타입이 복잡하여 any 사용
function getRetweetedOriginalId(result: any): string | null {
  // TweetWithVisibilityResults 래퍼 처리
  const tweet =
    result.__typename === 'TweetWithVisibilityResults' ? result.tweet : result;
  return tweet?.legacy?.retweeted_status_result?.result?.rest_id || null;
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
