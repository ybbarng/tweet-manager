import { describe, expect, it } from 'vitest';
import type { Tweet } from '@/types';
import { createMediaFilter } from '../media';

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

describe('미디어 필터', () => {
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

  describe('any (미디어 있음)', () => {
    it('미디어가 있는 트윗만 필터링', () => {
      const filter = createMediaFilter({ type: 'media', mediaType: 'any' });
      const kept = filter.apply(tweets);
      expect(kept.map((t) => t.id)).toEqual(['2', '3', '4', '5', '6']);
    });
  });

  describe('none (미디어 없음)', () => {
    it('미디어가 없는 트윗만 필터링', () => {
      const filter = createMediaFilter({ type: 'media', mediaType: 'none' });
      const kept = filter.apply(tweets);
      expect(kept.map((t) => t.id)).toEqual(['1']);
    });
  });

  describe('photo', () => {
    it('사진이 포함된 트윗 필터링', () => {
      const filter = createMediaFilter({ type: 'media', mediaType: 'photo' });
      const kept = filter.apply(tweets);
      expect(kept.map((t) => t.id)).toEqual(['2', '5', '6']);
    });
  });

  describe('video', () => {
    it('동영상이 포함된 트윗 필터링 (animated_gif 포함)', () => {
      const filter = createMediaFilter({ type: 'media', mediaType: 'video' });
      const kept = filter.apply(tweets);
      expect(kept.map((t) => t.id)).toEqual(['3', '4', '6']);
    });
  });

  describe('NOT 조건', () => {
    it('negate=true: 미디어 있는 트윗 제외', () => {
      const filter = createMediaFilter({
        type: 'media',
        mediaType: 'any',
        negate: true,
      });
      const kept = filter.apply(tweets);
      expect(kept.map((t) => t.id)).toEqual(['1']);
    });

    it('negate=true: 사진 없는 트윗만', () => {
      const filter = createMediaFilter({
        type: 'media',
        mediaType: 'photo',
        negate: true,
      });
      const kept = filter.apply(tweets);
      expect(kept.map((t) => t.id)).toEqual(['1', '3', '4']);
    });
  });
});
