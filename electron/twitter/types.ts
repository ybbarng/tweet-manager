/** Twitter GraphQL API 응답의 트윗 결과 */
export interface TweetResult {
  rest_id: string;
  core: {
    user_results: {
      result: {
        rest_id: string;
        legacy: {
          screen_name: string;
          name: string;
          profile_image_url_https: string;
        };
      };
    };
  };
  legacy: {
    full_text: string;
    created_at: string;
    favorite_count: number;
    retweet_count: number;
    reply_count: number;
    in_reply_to_status_id_str?: string;
    conversation_id_str?: string;
    retweeted_status_result?: unknown;
    entities?: {
      media?: Array<{
        type: string;
        media_url_https: string;
      }>;
    };
  };
}

/** UserTweets API 응답 구조 */
export interface UserTweetsResponse {
  data: {
    user: {
      result: {
        timeline_v2: {
          timeline: {
            instructions: Array<{
              type: string;
              entries?: Array<{
                entryId: string;
                sortIndex: string;
                content: {
                  entryType: string;
                  itemContent?: {
                    tweet_results: {
                      result: TweetResult;
                    };
                  };
                  value?: string; // cursor 값
                  cursorType?: string;
                };
              }>;
            }>;
          };
        };
      };
    };
  };
}

/** verify_credentials 응답 */
export interface VerifyCredentialsResponse {
  id_str: string;
  name: string;
  screen_name: string;
  profile_image_url_https: string;
}
