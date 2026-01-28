'use client';

interface LikesFilterProps {
  minLikes: number;
  onChange: (value: number) => void;
  enabled: boolean;
  onToggle: () => void;
}

export default function LikesFilter({ minLikes, onChange, enabled, onToggle }: LikesFilterProps) {
  return (
    <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="font-medium">좋아요 수 기준 보존</span>
        </label>
      </div>
      {enabled && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={minLikes}
            onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-24 px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-900 text-sm"
          />
          <span className="text-sm text-neutral-500">개 이상 좋아요를 받은 트윗 보존</span>
        </div>
      )}
    </div>
  );
}
