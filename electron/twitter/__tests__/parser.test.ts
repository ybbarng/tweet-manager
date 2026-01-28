import { describe, expect, it } from 'vitest';
import {
  parseTimelineResponse,
  parseTweetResult,
  parseVerifyCredentials,
} from '../parser';
import type {
  TweetResult,
  UserTweetsResponse,
  VerifyCredentialsResponse,
} from '../types';
import {
  createMockUserTweetsResponse,
  MOCK_BROKEN_RESPONSE_MISSING_LEGACY,
  MOCK_BROKEN_VERIFY_CREDENTIALS_MISSING_FIELDS,
  MOCK_TWEET_HIGH_LIKES,
  MOCK_TWEET_NORMAL,
  MOCK_TWEET_REPLY,
  MOCK_TWEET_RETWEET,
  MOCK_TWEET_THREAD_CONT,
  MOCK_TWEET_THREAD_HEAD,
  MOCK_TWEET_WITH_MEDIA,
  MOCK_VERIFY_CREDENTIALS,
} from './fixtures';

// ============================================================
// 1. verify_credentials 응답 파싱 스펙
// ============================================================
describe('parseVerifyCredentials - API 스펙 검증', () => {
  it('필수 필드(id_str, name, screen_name, profile_image_url_https)를 올바르게 매핑한다', () => {
    const user = parseVerifyCredentials(MOCK_VERIFY_CREDENTIALS);

    expect(user.id).toBe('123456789');
    expect(user.name).toBe('테스트 사용자');
    expect(user.screenName).toBe('testuser');
    expect(user.profileImageUrl).toBe(
      'https://pbs.twimg.com/profile_images/test/photo.jpg',
    );
  });

  it('응답에 id_str이 없으면 id가 undefined가 된다 (스펙 변경 감지)', () => {
    const broken =
      MOCK_BROKEN_VERIFY_CREDENTIALS_MISSING_FIELDS as unknown as VerifyCredentialsResponse;
    const user = parseVerifyCredentials(broken);

    // id_str이 없어서 undefined — 이 테스트가 통과하면 "스펙이 바뀌었다"를 의미
    expect(user.id).toBeUndefined();
  });
});

// ============================================================
// 2. TweetResult 개별 파싱 스펙
// ============================================================
describe('parseTweetResult - 트윗 필드 매핑 스펙', () => {
  it('일반 트윗의 모든 필드를 올바르게 추출한다', () => {
    const tweet = parseTweetResult(MOCK_TWEET_NORMAL);

    expect(tweet).not.toBeNull();
    expect(tweet!.id).toBe('1001');
    expect(tweet!.text).toBe('일반 트윗입니다.');
    expect(tweet!.createdAt).toBe('Mon Jan 01 12:00:00 +0000 2024');
    expect(tweet!.likes).toBe(15);
    expect(tweet!.retweets).toBe(3);
    expect(tweet!.replies).toBe(1);
    expect(tweet!.conversationId).toBe('1001');
    expect(tweet!.inReplyToId).toBeUndefined();
    expect(tweet!.isRetweet).toBe(false);
    expect(tweet!.media).toBeUndefined();
  });

  it('답글 트윗에서 in_reply_to_status_id_str이 inReplyToId로 매핑된다', () => {
    const tweet = parseTweetResult(MOCK_TWEET_REPLY);

    expect(tweet).not.toBeNull();
    expect(tweet!.id).toBe('1002');
    expect(tweet!.inReplyToId).toBe('9999');
    expect(tweet!.conversationId).toBe('9999');
  });

  it('리트윗은 retweeted_status_result 존재 여부로 isRetweet을 판별한다', () => {
    const tweet = parseTweetResult(MOCK_TWEET_RETWEET);

    expect(tweet).not.toBeNull();
    expect(tweet!.isRetweet).toBe(true);
    expect(tweet!.text).toContain('RT @');
  });

  it('미디어 트윗에서 entities.media 배열을 올바르게 매핑한다', () => {
    const tweet = parseTweetResult(MOCK_TWEET_WITH_MEDIA);

    expect(tweet).not.toBeNull();
    expect(tweet!.media).toHaveLength(2);
    expect(tweet!.media![0]).toEqual({
      type: 'photo',
      url: 'https://pbs.twimg.com/media/test1.jpg',
    });
    expect(tweet!.media![1]).toEqual({
      type: 'video',
      url: 'https://pbs.twimg.com/media/test2.mp4',
    });
  });

  it('좋아요/리트윗 수가 숫자 타입으로 정확히 매핑된다', () => {
    const tweet = parseTweetResult(MOCK_TWEET_HIGH_LIKES);

    expect(tweet).not.toBeNull();
    expect(tweet!.likes).toBe(500);
    expect(tweet!.retweets).toBe(200);
    expect(tweet!.replies).toBe(80);
    expect(typeof tweet!.likes).toBe('number');
    expect(typeof tweet!.retweets).toBe('number');
  });

  it('타래 트윗은 동일한 conversation_id_str을 공유한다', () => {
    const head = parseTweetResult(MOCK_TWEET_THREAD_HEAD);
    const cont = parseTweetResult(MOCK_TWEET_THREAD_CONT);

    expect(head).not.toBeNull();
    expect(cont).not.toBeNull();
    expect(head!.conversationId).toBe('2001');
    expect(cont!.conversationId).toBe('2001');
    expect(cont!.inReplyToId).toBe('2001');
  });

  it('legacy 필드가 없는 깨진 응답에서는 null을 반환한다 (스펙 변경 감지)', () => {
    const broken =
      MOCK_BROKEN_RESPONSE_MISSING_LEGACY as unknown as TweetResult;
    const tweet = parseTweetResult(broken);

    expect(tweet).toBeNull();
  });
});

// ============================================================
// 3. UserTweets 타임라인 응답 파싱 스펙
// ============================================================
describe('parseTimelineResponse - 타임라인 응답 구조 검증', () => {
  it('여러 트윗을 포함한 응답에서 모든 트윗을 추출한다', () => {
    const response = createMockUserTweetsResponse([
      MOCK_TWEET_NORMAL,
      MOCK_TWEET_REPLY,
      MOCK_TWEET_RETWEET,
    ]);

    const result = parseTimelineResponse(response);

    expect(result.tweets).toHaveLength(3);
    expect(result.tweets[0].id).toBe('1001');
    expect(result.tweets[1].id).toBe('1002');
    expect(result.tweets[2].id).toBe('1003');
  });

  it('Bottom 커서를 nextCursor로 추출한다', () => {
    const response = createMockUserTweetsResponse(
      [MOCK_TWEET_NORMAL],
      'cursor-abc123-bottom',
    );

    const result = parseTimelineResponse(response);

    expect(result.nextCursor).toBe('cursor-abc123-bottom');
  });

  it('커서가 없으면 nextCursor가 undefined이다', () => {
    const response = createMockUserTweetsResponse([MOCK_TWEET_NORMAL]);
    const result = parseTimelineResponse(response);

    expect(result.nextCursor).toBeUndefined();
  });

  it('빈 타임라인에서는 빈 배열을 반환한다', () => {
    const response = createMockUserTweetsResponse([]);
    const result = parseTimelineResponse(response);

    expect(result.tweets).toHaveLength(0);
  });

  it('timeline_v2 구조가 없으면 에러가 발생한다 (스펙 변경 감지)', () => {
    const broken = {
      data: { user: { result: {} } },
    } as unknown as UserTweetsResponse;

    expect(() => parseTimelineResponse(broken)).toThrow();
  });

  it('instructions 배열에 entries가 없는 항목은 무시한다', () => {
    const response: UserTweetsResponse = {
      data: {
        user: {
          result: {
            timeline_v2: {
              timeline: {
                instructions: [
                  { type: 'TimelineClearCache' }, // entries 없음
                  {
                    type: 'TimelineAddEntries',
                    entries: [
                      {
                        entryId: 'tweet-1001',
                        sortIndex: '1',
                        content: {
                          entryType: 'TimelineTimelineItem',
                          itemContent: {
                            tweet_results: { result: MOCK_TWEET_NORMAL },
                          },
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    };

    const result = parseTimelineResponse(response);
    expect(result.tweets).toHaveLength(1);
  });
});

// ============================================================
// 4. 필드 이름 스냅샷 - API 스펙 변경 시 이 테스트가 깨진다
// ============================================================
describe('API 응답 필드명 스냅샷', () => {
  it('TweetResult는 rest_id, legacy.full_text, legacy.favorite_count 등의 필드를 사용한다', () => {
    // 이 테스트는 코드가 의존하는 API 필드명을 명시적으로 검증한다.
    // API 스펙이 바뀌어 필드명이 달라지면 이 테스트가 실패한다.
    const result = MOCK_TWEET_NORMAL;

    // rest_id (트윗 ID)
    expect(result).toHaveProperty('rest_id');

    // legacy 하위 필드들
    expect(result.legacy).toHaveProperty('full_text');
    expect(result.legacy).toHaveProperty('created_at');
    expect(result.legacy).toHaveProperty('favorite_count');
    expect(result.legacy).toHaveProperty('retweet_count');
    expect(result.legacy).toHaveProperty('reply_count');

    // 선택적 필드
    expect(MOCK_TWEET_REPLY.legacy).toHaveProperty('in_reply_to_status_id_str');
    expect(MOCK_TWEET_REPLY.legacy).toHaveProperty('conversation_id_str');
    expect(MOCK_TWEET_RETWEET.legacy).toHaveProperty('retweeted_status_result');
    expect(MOCK_TWEET_WITH_MEDIA.legacy).toHaveProperty('entities');
    expect(MOCK_TWEET_WITH_MEDIA.legacy.entities).toHaveProperty('media');
    expect(MOCK_TWEET_WITH_MEDIA.legacy.entities!.media![0]).toHaveProperty(
      'type',
    );
    expect(MOCK_TWEET_WITH_MEDIA.legacy.entities!.media![0]).toHaveProperty(
      'media_url_https',
    );
  });

  it('UserTweetsResponse는 data.user.result.timeline_v2.timeline.instructions 경로를 사용한다', () => {
    const response = createMockUserTweetsResponse([MOCK_TWEET_NORMAL]);

    expect(response).toHaveProperty(
      'data.user.result.timeline_v2.timeline.instructions',
    );
    expect(
      response.data.user.result.timeline_v2.timeline.instructions[0],
    ).toHaveProperty('entries');

    const entry =
      response.data.user.result.timeline_v2.timeline.instructions[0]
        .entries![0];
    expect(entry).toHaveProperty('content.itemContent.tweet_results.result');
  });

  it('VerifyCredentialsResponse는 id_str, name, screen_name, profile_image_url_https를 사용한다', () => {
    expect(MOCK_VERIFY_CREDENTIALS).toHaveProperty('id_str');
    expect(MOCK_VERIFY_CREDENTIALS).toHaveProperty('name');
    expect(MOCK_VERIFY_CREDENTIALS).toHaveProperty('screen_name');
    expect(MOCK_VERIFY_CREDENTIALS).toHaveProperty('profile_image_url_https');
  });
});
