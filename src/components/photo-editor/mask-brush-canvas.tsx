import { type Ref } from 'react';

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
        <canvas
          ref={brush.overlayRef}
          className={cn(
            'absolute touch-none rounded-lg',
            enabled ? 'cursor-crosshair' : 'pointer-events-none'
          )}
          style={{
            left: brush.layout.left,
            top: brush.layout.top,
            width: brush.layout.width,
            height: brush.layout.height,
          }}
          onPointerDown={brush.onPointerDown}
          onPointerMove={brush.onPointerMove}
          onPointerUp={brush.onPointerUp}
          onPointerCancel={brush.onPointerUp}
        />
      )}
    </div>
  );
}

export type { MaskBrushHandle, MaskBrushState };
