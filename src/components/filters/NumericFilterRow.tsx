'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ComparisonOperator } from '@/lib/filters/types';
import {
  fieldTextStyle,
  filterLabel,
  inputStyle,
  sqlNumber,
  sqlOperator,
} from './styles';

const COMPARISON_OPERATORS: ComparisonOperator[] = ['<=', '<', '>=', '>', '='];

export interface NumericFilterRowProps {
  label: string;
  fieldName: string;
  enabled: boolean;
  operator: ComparisonOperator;
  value: number;
  onEnabledChange: (enabled: boolean) => void;
  onOperatorChange: (op: ComparisonOperator) => void;
  onValueChange: (value: number) => void;
  inputWidth?: string;
  isFirst?: boolean;
}

export default function NumericFilterRow({
  label,
  fieldName,
  enabled,
  operator,
  value,
  onEnabledChange,
  onOperatorChange,
  onValueChange,
  inputWidth = 'w-20',
  isFirst = false,
}: NumericFilterRowProps) {
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
      <Select
        value={operator}
        onValueChange={(v) => onOperatorChange(v as ComparisonOperator)}
        disabled={!enabled}
      >
        <SelectTrigger
          className={`w-16 h-7 ${enabled ? sqlOperator : 'text-neutral-400'}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COMPARISON_OPERATORS.map((op) => (
            <SelectItem key={op} value={op}>
              {op}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) =>
          onValueChange(Math.max(0, Number.parseInt(e.target.value, 10) || 0))
        }
        disabled={!enabled}
        className={`${inputWidth} h-7 border-neutral-300 dark:border-neutral-700 ${inputStyle(enabled, sqlNumber)}`}
      />
    </div>
  );
}
