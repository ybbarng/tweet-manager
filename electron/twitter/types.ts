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
  /** 조회수 정보 (view_count_info 객체 또는 views 객체) */
  views?: {
    count?: string;
    state?: string;
  };
}

/** Timeline entry 구조 */
export interface TimelineEntry {
  entryId: string;
  sortIndex: string;
  content: {
    entryType: string;
    itemContent?: {
      tweet_results: {
        result: TweetResult;
      };
    };
    items?: Array<{
      entryId: string;
      item: {
        itemContent: {
          tweet_results: {
            result: TweetResult;
          };
        };
      };
    }>;
    value?: string; // cursor 값
    cursorType?: string;
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
              entry?: TimelineEntry; // TimelinePinEntry용
              entries?: TimelineEntry[];
            }>;
          };
        };
      };
    };
  };
}

/** GraphQL Viewer 응답 */
export interface ViewerResponse {
  data: {
    viewer: {
      user_results: {
        result: {
          __typename: string;
          id: string;
          rest_id: string;
          legacy: {
            name: string;
            screen_name: string;
            profile_image_url_https: string;
          };
        };
      };
    };
  };
}
