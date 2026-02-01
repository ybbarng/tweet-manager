/**
 * Twitter GraphQL API mock 응답 데이터.
 * 실제 API 응답 구조를 그대로 재현하여, 스펙 변경 시 파싱 실패로 감지한다.
 */

import type { TweetResult, UserTweetsResponse, ViewerResponse } from '../types';

// --- GraphQL Viewer 응답 ---

export const MOCK_VIEWER_RESPONSE: ViewerResponse = {
  data: {
    viewer: {
      user_results: {
        result: {
          __typename: 'User',
          id: 'VXNlcjoxMjM0NTY3ODk=',
          rest_id: '123456789',
          legacy: {
            name: '테스트 사용자',
            screen_name: 'testuser',
            profile_image_url_https:
              'https://pbs.twimg.com/profile_images/test/photo.jpg',
          },
        },
      },
    },
  },
};

// --- 개별 TweetResult ---

/** 일반 트윗 */
export const MOCK_TWEET_NORMAL: TweetResult = {
  rest_id: '1001',
  core: {
    user_results: {
      result: {
        rest_id: '123456789',
        legacy: {
          screen_name: 'testuser',
          name: '테스트 사용자',
          profile_image_url_https:
            'https://pbs.twimg.com/profile_images/test/photo.jpg',
        },
      },
    },
  },
  legacy: {
    full_text: '일반 트윗입니다.',
    created_at: 'Mon Jan 01 12:00:00 +0000 2024',
    favorite_count: 15,
    retweet_count: 3,
    reply_count: 1,
    conversation_id_str: '1001',
    entities: {},
  },
};

/** 답글 트윗 */
export const MOCK_TWEET_REPLY: TweetResult = {
  rest_id: '1002',
  core: {
    user_results: {
      result: {
        rest_id: '123456789',
        legacy: {
          screen_name: 'testuser',
          name: '테스트 사용자',
          profile_image_url_https:
            'https://pbs.twimg.com/profile_images/test/photo.jpg',
        },
      },
    },
  },
  legacy: {
    full_text: '@someone 답글입니다.',
    created_at: 'Tue Jan 02 15:30:00 +0000 2024',
    favorite_count: 0,
    retweet_count: 0,
    reply_count: 0,
    in_reply_to_status_id_str: '9999',
    conversation_id_str: '9999',
    entities: {},
  },
};

/** 리트윗 */
export const MOCK_TWEET_RETWEET: TweetResult = {
  rest_id: '1003',
  core: {
    user_results: {
      result: {
        rest_id: '123456789',
        legacy: {
          screen_name: 'testuser',
          name: '테스트 사용자',
          profile_image_url_https:
            'https://pbs.twimg.com/profile_images/test/photo.jpg',
        },
      },
    },
  },
  legacy: {
    full_text: 'RT @other: 원본 트윗 내용',
    created_at: 'Wed Jan 03 09:00:00 +0000 2024',
    favorite_count: 0,
    retweet_count: 100,
    reply_count: 0,
    conversation_id_str: '1003',
    retweeted_status_result: { result: {} },
    entities: {},
  },
};

/** 미디어가 포함된 트윗 */
export const MOCK_TWEET_WITH_MEDIA: TweetResult = {
  rest_id: '1004',
  core: {
    user_results: {
      result: {
        rest_id: '123456789',
        legacy: {
          screen_name: 'testuser',
          name: '테스트 사용자',
          profile_image_url_https:
            'https://pbs.twimg.com/profile_images/test/photo.jpg',
        },
      },
    },
  },
  legacy: {
    full_text: '이미지가 포함된 트윗 https://t.co/xxx',
    created_at: 'Thu Jan 04 18:00:00 +0000 2024',
    favorite_count: 50,
    retweet_count: 20,
    reply_count: 5,
    conversation_id_str: '1004',
    entities: {
      media: [
        {
          type: 'photo',
          media_url_https: 'https://pbs.twimg.com/media/test1.jpg',
        },
        {
          type: 'video',
          media_url_https: 'https://pbs.twimg.com/media/test2.mp4',
        },
      ],
    },
  },
};

/** 좋아요가 많은 트윗 (보존 대상) */
export const MOCK_TWEET_HIGH_LIKES: TweetResult = {
  rest_id: '1005',
  core: {
    user_results: {
      result: {
        rest_id: '123456789',
        legacy: {
          screen_name: 'testuser',
          name: '테스트 사용자',
          profile_image_url_https:
            'https://pbs.twimg.com/profile_images/test/photo.jpg',
        },
      },
    },
  },
  legacy: {
    full_text: '인기 트윗입니다! 많은 좋아요를 받았습니다.',
    created_at: 'Fri Jan 05 10:00:00 +0000 2024',
    favorite_count: 500,
    retweet_count: 200,
    reply_count: 80,
    conversation_id_str: '1005',
    entities: {},
  },
};

/** 타래(스레드) 트윗 - 첫 트윗 */
export const MOCK_TWEET_THREAD_HEAD: TweetResult = {
  rest_id: '2001',
  core: {
    user_results: {
      result: {
        rest_id: '123456789',
        legacy: {
          screen_name: 'testuser',
          name: '테스트 사용자',
          profile_image_url_https:
            'https://pbs.twimg.com/profile_images/test/photo.jpg',
        },
      },
    },
  },
  legacy: {
    full_text: '타래 시작 (1/3)',
    created_at: 'Sat Jan 06 12:00:00 +0000 2024',
    favorite_count: 10,
    retweet_count: 2,
    reply_count: 1,
    conversation_id_str: '2001',
    entities: {},
  },
};

/** 타래(스레드) 트윗 - 이어지는 트윗 */
export const MOCK_TWEET_THREAD_CONT: TweetResult = {
  rest_id: '2002',
  core: {
    user_results: {
      result: {
        rest_id: '123456789',
        legacy: {
          screen_name: 'testuser',
          name: '테스트 사용자',
          profile_image_url_https:
            'https://pbs.twimg.com/profile_images/test/photo.jpg',
        },
      },
    },
  },
  legacy: {
    full_text: '타래 계속 (2/3)',
    created_at: 'Sat Jan 06 12:01:00 +0000 2024',
    favorite_count: 2,
    retweet_count: 0,
    reply_count: 0,
    in_reply_to_status_id_str: '2001',
    conversation_id_str: '2001',
    entities: {},
  },
};

// --- UserTweets 전체 응답 ---

export function createMockUserTweetsResponse(
  tweetResults: TweetResult[],
  bottomCursor?: string,
): UserTweetsResponse {
  const entries = tweetResults.map((result, i) => ({
    entryId: `tweet-${result.rest_id}`,
    sortIndex: String(tweetResults.length - i),
    content: {
      entryType: 'TimelineTimelineItem',
      itemContent: {
        tweet_results: { result },
      },
    },
  }));

  if (bottomCursor) {
    entries.push({
      entryId: 'cursor-bottom',
      sortIndex: '0',
      content: {
        entryType: 'TimelineTimelineCursor',
        cursorType: 'Bottom',
        value: bottomCursor,
      } as unknown as (typeof entries)[number]['content'],
    });
  }

  return {
    data: {
      user: {
        result: {
          timeline_v2: {
            timeline: {
              instructions: [
                {
                  type: 'TimelineAddEntries',
                  entries,
                },
              ],
            },
          },
        },
      },
    },
  };
}

/** 응답 구조가 완전히 바뀐 경우를 시뮬레이션하는 깨진 mock */
export const MOCK_BROKEN_RESPONSE_MISSING_TIMELINE = {
  data: {
    user: {
      result: {
        // timeline_v2가 없음
      },
    },
  },
};

export const MOCK_BROKEN_RESPONSE_MISSING_LEGACY = {
  rest_id: '9999',
  core: {
    user_results: {
      result: {
        rest_id: '123456789',
        legacy: {
          screen_name: 'testuser',
          name: '테스트 사용자',
          profile_image_url_https: 'https://example.com/photo.jpg',
        },
      },
    },
  },
  // legacy 필드가 없음
};

export const MOCK_BROKEN_VIEWER_MISSING_FIELDS = {
  data: {
    viewer: {
      user_results: {
        // result가 없음
      },
    },
  },
};

// --- 고정 트윗(Pinned Tweet) ---

/** 고정 트윗 */
export const MOCK_TWEET_PINNED: TweetResult = {
  rest_id: '3001',
  core: {
    user_results: {
      result: {
        rest_id: '123456789',
        legacy: {
          screen_name: 'testuser',
          name: '테스트 사용자',
          profile_image_url_https:
            'https://pbs.twimg.com/profile_images/test/photo.jpg',
        },
      },
    },
  },
  legacy: {
    full_text: '고정된 중요 트윗입니다.',
    created_at: 'Mon Jul 01 12:00:00 +0000 2024',
    favorite_count: 100,
    retweet_count: 50,
    reply_count: 10,
    conversation_id_str: '3001',
    entities: {},
  },
};

/** 고정 트윗이 포함된 응답 생성 */
export function createMockResponseWithPinnedTweet(
  tweetResults: TweetResult[],
  pinnedTweet: TweetResult,
): UserTweetsResponse {
  const entries = tweetResults.map((result, i) => ({
    entryId: `tweet-${result.rest_id}`,
    sortIndex: String(tweetResults.length - i),
    content: {
      entryType: 'TimelineTimelineItem',
      itemContent: {
        tweet_results: { result },
      },
    },
  }));

  return {
    data: {
      user: {
        result: {
          timeline_v2: {
            timeline: {
              instructions: [
                { type: 'TimelineClearCache' },
                {
                  type: 'TimelinePinEntry',
                  entry: {
                    entryId: `tweet-${pinnedTweet.rest_id}`,
                    sortIndex: '999999',
                    content: {
                      entryType: 'TimelineTimelineItem',
                      itemContent: {
                        tweet_results: { result: pinnedTweet },
                      },
                    },
                  },
                },
                {
                  type: 'TimelineAddEntries',
                  entries,
                },
              ],
            },
          },
        },
      },
    },
  };
}

// --- 쓰레드 모듈(TimelineTimelineModule) ---

/** 쓰레드 모듈용 트윗 - 오래된 것 (시작점) */
export const MOCK_THREAD_MODULE_OLD: TweetResult = {
  rest_id: '4001',
  core: {
    user_results: {
      result: {
        rest_id: '123456789',
        legacy: {
          screen_name: 'testuser',
          name: '테스트 사용자',
          profile_image_url_https:
            'https://pbs.twimg.com/profile_images/test/photo.jpg',
        },
      },
    },
  },
  legacy: {
    full_text: '쓰레드 시작 트윗입니다.',
    created_at: 'Mon Nov 15 06:00:00 +0000 2025',
    favorite_count: 5,
    retweet_count: 1,
    reply_count: 2,
    conversation_id_str: '4001',
    entities: {},
  },
};

/** 쓰레드 모듈용 트윗 - 중간 */
export const MOCK_THREAD_MODULE_MID: TweetResult = {
  rest_id: '4002',
  core: {
    user_results: {
      result: {
        rest_id: '123456789',
        legacy: {
          screen_name: 'testuser',
          name: '테스트 사용자',
          profile_image_url_https:
            'https://pbs.twimg.com/profile_images/test/photo.jpg',
        },
      },
    },
  },
  legacy: {
    full_text: '쓰레드 중간 트윗입니다.',
    created_at: 'Sat Jan 17 13:00:00 +0000 2026',
    favorite_count: 3,
    retweet_count: 0,
    reply_count: 1,
    in_reply_to_status_id_str: '4001',
    conversation_id_str: '4001',
    entities: {},
  },
};

/** 쓰레드 모듈용 트윗 - 최신 */
export const MOCK_THREAD_MODULE_NEW: TweetResult = {
  rest_id: '4003',
  core: {
    user_results: {
      result: {
        rest_id: '123456789',
        legacy: {
          screen_name: 'testuser',
          name: '테스트 사용자',
          profile_image_url_https:
            'https://pbs.twimg.com/profile_images/test/photo.jpg',
        },
      },
    },
  },
  legacy: {
    full_text: '쓰레드 최신 트윗입니다.',
    created_at: 'Sat Feb 01 06:00:00 +0000 2026',
    favorite_count: 10,
    retweet_count: 2,
    reply_count: 0,
    in_reply_to_status_id_str: '4002',
    conversation_id_str: '4001',
    entities: {},
  },
};

/** 쓰레드 모듈이 포함된 응답 생성 */
export function createMockResponseWithThreadModule(
  normalTweets: TweetResult[],
  threadTweets: TweetResult[],
): UserTweetsResponse {
  const normalEntries = normalTweets.map((result, i) => ({
    entryId: `tweet-${result.rest_id}`,
    sortIndex: String(normalTweets.length - i + 100),
    content: {
      entryType: 'TimelineTimelineItem',
      itemContent: {
        tweet_results: { result },
      },
    },
  }));

  const threadModuleEntry = {
    entryId: 'profile-conversation-12345',
    sortIndex: '50',
    content: {
      entryType: 'TimelineTimelineModule',
      items: threadTweets.map((result) => ({
        entryId: `tweet-${result.rest_id}`,
        item: {
          itemContent: {
            tweet_results: { result },
          },
        },
      })),
    },
  };

  return {
    data: {
      user: {
        result: {
          timeline_v2: {
            timeline: {
              instructions: [
                {
                  type: 'TimelineAddEntries',
                  entries: [...normalEntries, threadModuleEntry],
                },
              ],
            },
          },
        },
      },
    },
  };
}

// --- 리트윗 원본 트윗 번들 ---

/** 리트윗 (원본 ID 포함) */
export const MOCK_RETWEET_WITH_ORIGINAL_ID: TweetResult = {
  rest_id: '5001',
  core: {
    user_results: {
      result: {
        rest_id: '123456789',
        legacy: {
          screen_name: 'testuser',
          name: '테스트 사용자',
          profile_image_url_https:
            'https://pbs.twimg.com/profile_images/test/photo.jpg',
        },
      },
    },
  },
  legacy: {
    full_text: 'RT @other: 원본 트윗 내용입니다.',
    created_at: 'Sat Feb 01 10:00:00 +0000 2026',
    favorite_count: 0,
    retweet_count: 50,
    reply_count: 0,
    conversation_id_str: '5001',
    retweeted_status_result: {
      result: {
        rest_id: '5002', // 원본 트윗 ID
      },
    },
    entities: {},
  },
};

/** 리트윗의 원본 트윗 (번들로 함께 전송됨) */
export const MOCK_RETWEET_ORIGINAL: TweetResult = {
  rest_id: '5002',
  core: {
    user_results: {
      result: {
        rest_id: '999999',
        legacy: {
          screen_name: 'other',
          name: '다른 사용자',
          profile_image_url_https:
            'https://pbs.twimg.com/profile_images/other/photo.jpg',
        },
      },
    },
  },
  legacy: {
    full_text: '원본 트윗 내용입니다.',
    created_at: 'Fri Jan 01 12:00:00 +0000 2021',
    favorite_count: 100,
    retweet_count: 50,
    reply_count: 10,
    conversation_id_str: '5002',
    entities: {},
  },
};
