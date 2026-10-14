'use client';

import { Select as SelectPrimitive } from '@base-ui/react/select';
import { ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type DropdownOption = { value: string; label: string };
export type DropdownGroup = { label: string; options: DropdownOption[] };

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options?: DropdownOption[];
  /** Options shown under small headings, after the plain ones */
  groups?: DropdownGroup[];
  ariaLabel: string;
  className?: string;
  menuClassName?: string;
}

// Replaces the browser's native <select>. The native list is drawn by the OS and
// lands in a different place on every phone and browser; this one always opens
// directly below its field and keeps the arrow inside the box.
export default function Dropdown({ value, onChange, options = [], groups = [], ariaLabel, className, menuClassName }: DropdownProps) {
  const allOptions = [...options, ...groups.flatMap(g => g.options)];
  const labelOf = (v: string | null) => allOptions.find(o => o.value === v)?.label ?? '';

  return (
    <Select
      value={value}
      items={allOptions}
      onValueChange={v => { if (typeof v === 'string') onChange(v); }}
    >
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          'flex w-full items-center justify-between gap-2 text-left text-sm text-foreground outline-none select-none',
          'focus-visible:ring-1 focus-visible:ring-[#c8985e]/70 [&_svg]:transition-transform [&[data-popup-open]_svg]:rotate-180',
          className,
        )}
      >
        <SelectPrimitive.Value className="min-w-0 flex-1 truncate">
          {(v: string | null) => labelOf(v)}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon render={<ChevronDown className="size-4 shrink-0 text-muted-foreground" />} />
      </SelectPrimitive.Trigger>
      <SelectContent alignItemWithTrigger={false} align="start" sideOffset={6} className={cn('min-w-52', menuClassName)}>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value} className="py-2 text-sm">
            {o.label}
          </SelectItem>
        ))}
        {groups.map((g, i) => (
          <div key={g.label}>
            {(i > 0 || options.length > 0) && <SelectSeparator />}
            <SelectGroup>
              <SelectLabel className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide">{g.label}</SelectLabel>
              {g.options.map(o => (
                <SelectItem key={o.value} value={o.value} className="py-2 text-sm">
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
