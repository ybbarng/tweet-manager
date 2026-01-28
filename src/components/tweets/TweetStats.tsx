'use client';

interface TweetStatsProps {
  total: number;
  toDelete: number;
  preserved: number;
}

export default function TweetStats({ total, toDelete, preserved }: TweetStatsProps) {
  const deletePercent = total > 0 ? Math.round((toDelete / total) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center">
        <p className="text-2xl font-bold">{total.toLocaleString()}</p>
        <p className="text-sm text-neutral-500">전체 트윗</p>
      </div>
      <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-center">
        <p className="text-2xl font-bold text-red-600">{toDelete.toLocaleString()}</p>
        <p className="text-sm text-red-500">삭제 대상 ({deletePercent}%)</p>
      </div>
      <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
        <p className="text-2xl font-bold text-green-600">{preserved.toLocaleString()}</p>
        <p className="text-sm text-green-500">보존</p>
      </div>
    </div>
  );
}
