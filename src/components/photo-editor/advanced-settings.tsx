import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

type AdvancedSettingsProps = {
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
};

/** Collapsible Advanced block for less-used edit options. */
export function AdvancedSettings({
  children,
  className,
  defaultOpen = false,
}: AdvancedSettingsProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg py-1 text-left text-sm font-semibold text-slate-800 transition-colors hover:text-blue-700"
      >
        Advanced
        <ChevronDown
          className={cn(
            'size-4 text-slate-400 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open ? <div className="mt-2.5 space-y-3.5">{children}</div> : null}
    </div>
  );
}
