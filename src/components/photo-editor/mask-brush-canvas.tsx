import {
  useState,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react';

import { cn } from '@/lib/utils';
import {
  useMaskBrush,
  type MaskBrushHandle,
  type MaskBrushState,
} from '@/components/photo-editor/use-mask-brush';

type Props = {
  imageSrc: string;
  enabled: boolean;
  brushSize: number;
  handleRef?: Ref<MaskBrushHandle | null>;
  onStateChange?: (state: MaskBrushState) => void;
  onMaskChange?: () => void;
  className?: string;
};

/** Source image + precision-edit brush overlay (paints only when enabled). */
export function MaskBrushCanvas({
  imageSrc,
  enabled,
  brushSize,
  handleRef,
  onStateChange,
  onMaskChange,
  className,
}: Props) {
  const brush = useMaskBrush({
    imageSrc,
    enabled,
    brushSize,
    handleRef,
    onStateChange,
    onMaskChange,
  });
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const trackCursor = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!enabled) {
      setCursor(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setCursor({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  return (
    <div
      ref={brush.containerRef}
      className={cn(
        'absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_top,#f8fafc,#eef2f7)] p-3 sm:p-4',
        className
      )}
    >
      <img
        ref={brush.imageRef}
        src={imageSrc}
        alt="Original photo"
        onLoad={brush.measure}
        className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
        draggable={false}
      />
      {brush.layout.width > 0 && (
        <>
          <canvas
            ref={brush.overlayRef}
            className={cn(
              'absolute touch-none rounded-lg',
              enabled ? 'cursor-none' : 'pointer-events-none'
            )}
            style={{
              left: brush.layout.left,
              top: brush.layout.top,
              width: brush.layout.width,
              height: brush.layout.height,
            }}
            onPointerDown={(event) => {
              trackCursor(event);
              brush.onPointerDown(event);
            }}
            onPointerMove={(event) => {
              trackCursor(event);
              brush.onPointerMove(event);
            }}
            onPointerUp={brush.onPointerUp}
            onPointerCancel={brush.onPointerUp}
            onPointerEnter={trackCursor}
            onPointerLeave={() => setCursor(null)}
          />
          {enabled && cursor && (
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-full border border-red-500/70 bg-red-500/35 shadow-[0_0_0_1px_rgba(255,255,255,0.55)]"
              style={{
                left: brush.layout.left + cursor.x,
                top: brush.layout.top + cursor.y,
                width: brushSize,
                height: brushSize,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

export type { MaskBrushHandle, MaskBrushState };
