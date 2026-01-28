import * as fs from 'fs/promises';
import * as path from 'path';

interface ArchiveTweet {
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

/**
 * Twitter 아카이브 파일(tweets.js 또는 tweet.js)을 파싱하여 트윗 배열 반환.
 * 아카이브의 JS 파일은 `window.YTD.tweet.part0 = [...]` 형태.
 */
export async function parseArchive(filePath: string): Promise<ArchiveTweet[]> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.zip') {
    return parseZipArchive(filePath);
  } else if (ext === '.js') {
    return parseJsFile(filePath);
  }

  throw new Error('지원하지 않는 파일 형식입니다. .zip 또는 .js 파일을 선택해주세요.');
}

async function parseJsFile(filePath: string): Promise<ArchiveTweet[]> {
  const content = await fs.readFile(filePath, 'utf-8');

  // `window.YTD.tweet.part0 = [...]` 형태에서 JSON 부분 추출
  const jsonMatch = content.match(/=\s*(\[[\s\S]*\])\s*;?\s*$/);
  if (!jsonMatch) {
    throw new Error('유효한 Twitter 아카이브 JS 파일이 아닙니다.');
  }

  const rawTweets = JSON.parse(jsonMatch[1]);
  return rawTweets.map((item: { tweet: Record<string, unknown> }) => {
    const t = item.tweet;
    return {
      id: t.id_str as string || t.id as string,
      text: t.full_text as string || t.text as string || '',
      createdAt: t.created_at as string,
      likes: Number(t.favorite_count) || 0,
      retweets: Number(t.retweet_count) || 0,
      replies: Number(t.reply_count) || 0,
      inReplyToId: t.in_reply_to_status_id_str as string | undefined,
      conversationId: undefined,
      isRetweet: (t.full_text as string || '').startsWith('RT @'),
      media: undefined,
    };
  });
}

async function parseZipArchive(filePath: string): Promise<ArchiveTweet[]> {
  // ZIP 파일 내에서 tweets.js 또는 tweet.js를 찾아 파싱
  // Node.js 내장 모듈로 ZIP 처리가 제한적이므로, 사용자에게 JS 파일 직접 업로드를 안내
  const { createReadStream } = await import('fs');
  const { createUnzip } = await import('zlib');

  // 간단한 ZIP 처리: 파일을 읽어서 tweets.js 패턴을 찾음
  const buffer = await fs.readFile(filePath);
  const content = buffer.toString('utf-8');

  // ZIP 바이너리에서 직접 JS 파싱은 어려우므로 안내 메시지
  if (content.includes('window.YTD.tweet')) {
    // JS 파일이 직접 전달된 경우
    return parseJsFile(filePath);
  }

  // 실제 ZIP 처리를 위한 참조만 유지 (lint 방지)
  void createReadStream;
  void createUnzip;

  throw new Error(
    'ZIP 파일 내 tweets.js 파일을 직접 추출하여 업로드해주세요.\n' +
    '아카이브 ZIP > data > tweets.js 파일을 찾아 선택해주세요.'
  );
}
