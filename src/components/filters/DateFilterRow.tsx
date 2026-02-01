'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  fieldTextStyle,
  filterLabel,
  inputStyle,
  sqlOperator,
  sqlString,
} from './styles';

export interface DateFilterRowProps {
  label: string;
  enabled: boolean;
  date: string | null;
  operator: '>=' | '<=';
  onEnabledChange: (enabled: boolean) => void;
  onDateChange: (date: string | null) => void;
  isFirst?: boolean;
}

export default function DateFilterRow({
  label,
  enabled,
  date,
  operator,
  onEnabledChange,
  onDateChange,
  isFirst = false,
}: DateFilterRowProps) {
  const operatorDisplay = operator === '>=' ? '≥' : '≤';

  return (
    <div
      className={`ml-4 ${isFirst ? 'mt-3' : 'mt-1'} flex items-center gap-2 flex-wrap`}
    >
      <span className={filterLabel}>{label}</span>
      <Checkbox
        checked={enabled}
        onCheckedChange={(checked) => onEnabledChange(checked === true)}
        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
      />
      <span className={fieldTextStyle(enabled)}>created_at</span>
      <span className={enabled ? sqlOperator : 'text-neutral-400'}>
        {operatorDisplay}
      </span>
      <Input
        type="date"
        value={date || ''}
        onChange={(e) => onDateChange(e.target.value || null)}
        disabled={!enabled}
        className={`w-40 h-7 border-neutral-300 dark:border-neutral-700 ${inputStyle(enabled, sqlString)}`}
      />
    </div>
  );
}
