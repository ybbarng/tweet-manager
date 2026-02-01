import wretch, { type WretchError } from 'wretch';
import { RATE_LIMIT } from '../constants';
import { logger } from '../utils/logger';
import {
  ENDPOINTS,
  getDeleteTweetVariables,
  getUserTweetsVariables,
  USER_TWEETS_FEATURES,
  VIEWER_FEATURES,
} from './endpoints';
import {
  type FetchTweetsResult,
  type ParsedUser,
  parseTimelineResponse,
  parseViewer,
} from './parser';
import type { UserTweetsResponse, ViewerResponse } from './types';

/** 디버그용 API 응답 저장소 */
interface DebugEntry {
  pageNumber: number;
  fetchedAt: string;
  data: unknown;
}

const debugResponses: DebugEntry[] = [];

/** 디버그 응답 추가 */
function addDebugResponse(data: unknown, pageNumber: number): void {
  debugResponses.push({
    pageNumber,
    fetchedAt: new Date().toISOString(),
    data,
  });
  logger.log(`[debug] API 응답 저장 (메모리): page ${pageNumber}`);
}

/** 디버그 응답 초기화 */
export function clearDebugResponses(): void {
  debugResponses.length = 0;
  logger.log('[debug] API 응답 초기화');
}

/** 디버그 응답 내보내기 데이터 반환 */
export function getDebugExportData(): {
  exportedAt: string;
  responseCount: number;
  responses: DebugEntry[];
} {
  return {
    exportedAt: new Date().toISOString(),
    responseCount: debugResponses.length,
    responses: [...debugResponses],
  };
}

interface TwitterAuth {
  authToken: string;
  csrfToken: string;
  bearerToken: string;
  userId?: string;
  userAgent?: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class TwitterApiClient {
  private userId: string | null = null;
  private api;

  constructor(auth: TwitterAuth) {
    this.userId = auth.userId || null;
    // Electron의 실제 User-Agent 사용, 없으면 최신 Chrome 버전 사용
    const userAgent =
      auth.userAgent ||
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    this.api = wretch().headers({
      Authorization: `Bearer ${auth.bearerToken}`,
      Cookie: `auth_token=${auth.authToken}; ct0=${auth.csrfToken}`,
      'X-Csrf-Token': auth.csrfToken,
      'Content-Type': 'application/json',
      'User-Agent': userAgent,
      'X-Twitter-Active-User': 'yes',
      'X-Twitter-Auth-Type': 'OAuth2Session',
      'X-Twitter-Client-Language': 'ko',
    });
  }

  async verifyCredentials(): Promise<ParsedUser> {
    const params = new URLSearchParams({
      variables: JSON.stringify({
        withCommunitiesMemberships: false,
      }),
      features: JSON.stringify(VIEWER_FEATURES),
    });

    const data = await this.api
      .url(`${ENDPOINTS.VIEWER}?${params}`)
      .get()
      .json<ViewerResponse>();

    const user = parseViewer(data);
    this.userId = user.id;
    return user;
  }

  async fetchUserTweets(
    cursor?: string,
    pageNumber = 1,
    retryCount = 0,
  ): Promise<FetchTweetsResult> {
    if (!this.userId) {
      await this.verifyCredentials();
    }

    const variables = getUserTweetsVariables(this.userId!, cursor);
    const params = new URLSearchParams({
      variables: JSON.stringify(variables),
      features: JSON.stringify(USER_TWEETS_FEATURES),
    });

    try {
      const data = await this.api
        .url(`${ENDPOINTS.USER_TWEETS}?${params}`)
        .get()
        .json<UserTweetsResponse>();

      // 디버그: API 응답 메모리에 저장
      addDebugResponse(data, pageNumber);

      // 디버깅: 응답 구조 로깅
      const instructions =
        data?.data?.user?.result?.timeline_v2?.timeline?.instructions;
      if (instructions) {
        for (const inst of instructions) {
          if (inst.entries) {
            logger.log(
              `[twitter:fetch] ${inst.entries.length}개 엔트리, types:`,
              inst.entries
                .map((e) => e.content.entryType || 'unknown')
                .slice(0, 5),
            );
          }
        }
      }

      return parseTimelineResponse(data);
    } catch (err) {
      const error = err as WretchError;
      if (error.status === 429) {
        if (retryCount >= RATE_LIMIT.MAX_RETRIES) {
          throw new Error('Rate limit 초과: 최대 재시도 횟수 도달');
        }
        const retryAfter = parseInt(
          error.response?.headers?.get('x-rate-limit-reset') ||
            String(RATE_LIMIT.DEFAULT_RETRY_AFTER_SEC),
          10,
        );
        const waitMs = retryAfter * 1000 - Date.now();
        if (waitMs > 0) {
          await delay(Math.min(waitMs, RATE_LIMIT.MAX_WAIT_MS));
        }
        return this.fetchUserTweets(cursor, pageNumber, retryCount + 1);
      }
      throw new Error(`트윗 조회 실패: ${error.status || error.message}`);
    }
  }

  async deleteTweet(tweetId: string, retryCount = 0): Promise<void> {
    const variables = getDeleteTweetVariables(tweetId);

    try {
      await this.api
        .url(ENDPOINTS.DELETE_TWEET)
        .post({ variables, queryId: 'VaenaVgh5q5ih7kvyVjgtg' })
        .res();
    } catch (err) {
      const error = err as WretchError;
      if (error.status === 429) {
        if (retryCount >= RATE_LIMIT.MAX_RETRIES) {
          throw new Error('Rate limit 초과: 최대 재시도 횟수 도달');
        }
        // 재시도 시 대기 시간을 점점 늘림
        await delay(RATE_LIMIT.BASE_DELAY_MS * (retryCount + 1));
        return this.deleteTweet(tweetId, retryCount + 1);
      }
      throw new Error(`트윗 삭제 실패: ${error.status || error.message}`);
    }
  }
}
