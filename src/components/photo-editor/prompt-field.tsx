import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type PromptFieldProps = {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  disabled?: boolean;
  className?: string;
  footer?: ReactNode;
};

/** Labeled prompt textarea with in-box character counter. */
export function PromptField({
  id,
  label = 'Prompt',
  value,
  onChange,
  placeholder = "Describe what you want to change in the image, such as 'Change the background to a blue sky'.",
  maxLength = 2000,
  rows = 5,
  disabled,
  className,
  footer,
}: PromptFieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-800"
      >
        {label}
      </label>
      <div
        className={cn(
          'rounded-2xl border border-slate-200 bg-white transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100',
          disabled && 'opacity-70'
        )}
      >
        <textarea
          id={id}
          rows={rows}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-y rounded-2xl border-0 bg-transparent px-3.5 pt-3 pb-8 text-sm leading-relaxed text-slate-900 outline-none placeholder:text-slate-400"
        />
        <div className="pointer-events-none -mt-7 flex justify-end px-3.5 pb-2.5">
          <span className="text-xs text-slate-400">
            {value.length} / {maxLength}
          </span>
        </div>
      </div>
      {footer}
    </div>
  );
}
