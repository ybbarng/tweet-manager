import { describe, expect, it } from 'vitest';
import type { Tweet } from '@/types';
import { createHasPhotoFilter, createHasVideoFilter } from '../media';

function makeTweet(overrides: Partial<Tweet> = {}): Tweet {
  return {
    id: '1',
    text: 'hello',
    createdAt: new Date('2024-01-01'),
    likes: 0,
    retweets: 0,
    replies: 0,
    isRetweet: false,
    ...overrides,
  };
}

describe('사진 포함 여부 필터', () => {
  const tweets: Tweet[] = [
    makeTweet({ id: '1' }), // 미디어 없음
    makeTweet({
      id: '2',
      media: [{ type: 'photo', url: 'https://example.com/photo.jpg' }],
    }),
    makeTweet({
      id: '3',
      media: [{ type: 'video', url: 'https://example.com/video.mp4' }],
    }),
    makeTweet({
      id: '4',
      media: [{ type: 'animated_gif', url: 'https://example.com/gif.gif' }],
    }),
    makeTweet({
      id: '5',
      media: [
        { type: 'photo', url: 'https://example.com/1.jpg' },
        { type: 'photo', url: 'https://example.com/2.jpg' },
      ],
    }),
    makeTweet({
      id: '6',
      media: [
        { type: 'photo', url: 'https://example.com/photo.jpg' },
        { type: 'video', url: 'https://example.com/video.mp4' },
      ],
    }),
  ];

  it('hasPhoto=true: 사진 있는 트윗 삭제', () => {
    const filter = createHasPhotoFilter({ type: 'hasPhoto', hasPhoto: true });
    const toDelete = filter.apply(tweets);
    expect(toDelete.map((t) => t.id)).toEqual(['2', '5', '6']);
  });

  it('hasPhoto=false: 사진 없는 트윗 삭제', () => {
    const filter = createHasPhotoFilter({ type: 'hasPhoto', hasPhoto: false });
    const toDelete = filter.apply(tweets);
    expect(toDelete.map((t) => t.id)).toEqual(['1', '3', '4']);
  });

  it('필터 메타데이터 확인', () => {
    const filter = createHasPhotoFilter({ type: 'hasPhoto', hasPhoto: true });
    expect(filter.id).toBe('hasPhoto');
    expect(filter.type).toBe('hasPhoto');
    expect(filter.enabled).toBe(true);
  });
});

describe('동영상 포함 여부 필터', () => {
  const tweets: Tweet[] = [
    makeTweet({ id: '1' }), // 미디어 없음
    makeTweet({
      id: '2',
      media: [{ type: 'photo', url: 'https://example.com/photo.jpg' }],
    }),
    makeTweet({
      id: '3',
      media: [{ type: 'video', url: 'https://example.com/video.mp4' }],
    }),
    makeTweet({
      id: '4',
      media: [{ type: 'animated_gif', url: 'https://example.com/gif.gif' }],
    }),
    makeTweet({
      id: '5',
      media: [
        { type: 'photo', url: 'https://example.com/1.jpg' },
        { type: 'photo', url: 'https://example.com/2.jpg' },
      ],
    }),
    makeTweet({
      id: '6',
      media: [
        { type: 'photo', url: 'https://example.com/photo.jpg' },
        { type: 'video', url: 'https://example.com/video.mp4' },
      ],
    }),
  ];

  it('hasVideo=true: 동영상/GIF 있는 트윗 삭제', () => {
    const filter = createHasVideoFilter({ type: 'hasVideo', hasVideo: true });
    const toDelete = filter.apply(tweets);
    expect(toDelete.map((t) => t.id)).toEqual(['3', '4', '6']);
  });

  it('hasVideo=false: 동영상/GIF 없는 트윗 삭제', () => {
    const filter = createHasVideoFilter({ type: 'hasVideo', hasVideo: false });
    const toDelete = filter.apply(tweets);
    expect(toDelete.map((t) => t.id)).toEqual(['1', '2', '5']);
  });

  it('필터 메타데이터 확인', () => {
    const filter = createHasVideoFilter({ type: 'hasVideo', hasVideo: true });
    expect(filter.id).toBe('hasVideo');
    expect(filter.type).toBe('hasVideo');
    expect(filter.enabled).toBe(true);
  });
});
