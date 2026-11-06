import { useCallback, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';

import { cn } from '@/lib/utils';

type BeforeAfterSliderProps = {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  alt?: string;
  className?: string;
};

/** Drag (or keyboard) a vertical handle to compare original vs edited. */
export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Before',
  afterLabel = 'After',
  alt = 'Photo comparison',
  className,
}: BeforeAfterSliderProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [position, setPosition] = useState(50);

  const setFromClientX = useCallback((clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const { left, width } = frame.getBoundingClientRect();
    if (width <= 0) return;
    const next = ((clientX - left) / width) * 100;
    setPosition(Math.min(100, Math.max(0, next)));
  }, []);

  return (
    <div
      ref={frameRef}
      role="img"
      aria-label={alt}
      className={cn(
        'relative touch-none overflow-hidden rounded-xl bg-slate-100 select-none',
        className
      )}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        setFromClientX(event.clientX);
      }}
      onPointerMove={(event) => {
        if (!dragging.current) return;
        setFromClientX(event.clientX);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      <img
        src={afterSrc}
        alt=""
        draggable={false}
        className="block max-h-[min(70vh,720px)] w-full object-contain"
      />
      <img
        src={beforeSrc}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />

      <div
        className="pointer-events-none absolute inset-y-0 z-10 w-px bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.2)]"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md">
          <GripVertical className="size-4" aria-hidden />
        </div>
      </div>

      <span className="pointer-events-none absolute top-3 left-3 rounded-md bg-slate-900/70 px-2 py-1 text-[11px] font-semibold tracking-wide text-white uppercase">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-md bg-slate-900/70 px-2 py-1 text-[11px] font-semibold tracking-wide text-white uppercase">
        {afterLabel}
      </span>

      <input
        type="range"
        min={0}
        max={100}
        value={position}
        aria-label="Compare before and after"
        className="sr-only"
        onChange={(event) => setPosition(Number(event.target.value))}
      />
    </div>
  );
}
