import wretch, { type WretchError } from 'wretch';
import {
  ENDPOINTS,
  getDeleteTweetVariables,
  getUserTweetsVariables,
  USER_TWEETS_FEATURES,
} from './endpoints';
import {
  type FetchTweetsResult,
  type ParsedUser,
  parseTimelineResponse,
  parseVerifyCredentials,
} from './parser';
import type { UserTweetsResponse, VerifyCredentialsResponse } from './types';

interface TwitterAuth {
  authToken: string;
  csrfToken: string;
  bearerToken: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class TwitterApiClient {
  private userId: string | null = null;
  private api;

  constructor(auth: TwitterAuth) {
    this.auth = auth;
    this.api = wretch().headers({
      Authorization: `Bearer ${auth.bearerToken}`,
      Cookie: `auth_token=${auth.authToken}; ct0=${auth.csrfToken}`,
      'X-Csrf-Token': auth.csrfToken,
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'X-Twitter-Active-User': 'yes',
      'X-Twitter-Auth-Type': 'OAuth2Session',
      'X-Twitter-Client-Language': 'ko',
    });
  }

  async verifyCredentials(): Promise<ParsedUser> {
    const data = await this.api
      .url(ENDPOINTS.VERIFY_CREDENTIALS)
      .get()
      .json<VerifyCredentialsResponse>();

    const user = parseVerifyCredentials(data);
    this.userId = user.id;
    return user;
  }

  async fetchUserTweets(cursor?: string): Promise<FetchTweetsResult> {
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

      return parseTimelineResponse(data);
    } catch (err) {
      const error = err as WretchError;
      if (error.status === 429) {
        const retryAfter = parseInt(
          error.response?.headers?.get('x-rate-limit-reset') || '60',
          10,
        );
        const waitMs = retryAfter * 1000 - Date.now();
        if (waitMs > 0) {
          await delay(Math.min(waitMs, 60000));
        }
        return this.fetchUserTweets(cursor);
      }
      throw new Error(`트윗 조회 실패: ${error.status || error.message}`);
    }
  }

  async deleteTweet(tweetId: string): Promise<void> {
    const variables = getDeleteTweetVariables(tweetId);

    try {
      await this.api
        .url(ENDPOINTS.DELETE_TWEET)
        .post({ variables, queryId: 'VaenaVgh5q5ih7kvyVjgtg' })
        .res();
    } catch (err) {
      const error = err as WretchError;
      if (error.status === 429) {
        await delay(5000);
        return this.deleteTweet(tweetId);
      }
      throw new Error(`트윗 삭제 실패: ${error.status || error.message}`);
    }
  }
}
