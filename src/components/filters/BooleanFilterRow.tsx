'use client';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fieldTextStyle, filterLabel, sqlKeyword, sqlOperator } from './styles';

export interface BooleanFilterRowProps {
  label: string;
  fieldName: string;
  enabled: boolean;
  value: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onValueChange: (value: boolean) => void;
  isFirst?: boolean;
}

export default function BooleanFilterRow({
  label,
  fieldName,
  enabled,
  value,
  onEnabledChange,
  onValueChange,
  isFirst = false,
}: BooleanFilterRowProps) {
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
      <span className={fieldTextStyle(enabled)}>{fieldName}</span>
      <span className={enabled ? sqlOperator : 'text-neutral-400'}>=</span>
      <Select
        value={value ? 'true' : 'false'}
        onValueChange={(v) => onValueChange(v === 'true')}
        disabled={!enabled}
      >
        <SelectTrigger
          className={`w-20 h-7 ${enabled ? sqlKeyword : 'text-neutral-400'}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">TRUE</SelectItem>
          <SelectItem value="false">FALSE</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
