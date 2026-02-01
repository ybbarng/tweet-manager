import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Tweet } from '@/types';
import TweetCard from '../TweetCard';

const mockTweet: Tweet = {
  id: '123456',
  text: '테스트 트윗입니다',
  createdAt: new Date('2024-03-15T14:30:00'),
  likes: 10,
  retweets: 5,
  replies: 3,
  views: 100,
  isRetweet: false,
  hasPhoto: false,
  hasVideo: false,
  isReply: false,
};

describe('TweetCard', () => {
  it('트윗 텍스트를 표시한다', () => {
    render(<TweetCard tweet={mockTweet} />);
    expect(screen.getByText('테스트 트윗입니다')).toBeInTheDocument();
  });

  it('좋아요, 리트윗, 답글 수를 표시한다', () => {
    render(<TweetCard tweet={mockTweet} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('날짜를 표시한다', () => {
    render(<TweetCard tweet={mockTweet} />);
    expect(screen.getByText(/2024\. 3\. 15\./)).toBeInTheDocument();
  });

  it('리트윗인 경우 RT 라벨을 표시한다', () => {
    render(<TweetCard tweet={{ ...mockTweet, isRetweet: true }} />);
    expect(screen.getByText('RT')).toBeInTheDocument();
  });

  it('체크박스가 활성화되면 체크박스를 표시한다', () => {
    render(<TweetCard tweet={mockTweet} showCheckbox checked={true} />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('체크박스 클릭 시 onToggle이 호출된다', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <TweetCard
        tweet={mockTweet}
        showCheckbox
        checked={true}
        onToggle={onToggle}
      />,
    );
    await user.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledWith('123456');
  });
});
