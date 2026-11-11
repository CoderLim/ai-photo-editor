import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react';

export type MaskBrushHandle = {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  /** Black background, white paint — Fal mask_url. Null when empty. */
  exportMaskBlob: () => Promise<Blob | null>;
  hasMask: () => boolean;
};

export type MaskBrushState = {
  canUndo: boolean;
  canRedo: boolean;
  hasMask: boolean;
};

type Point = { x: number; y: number };
type Stroke = { radius: number; points: Point[] };

type Options = {
  imageSrc: string;
  enabled: boolean;
  brushSize: number;
  handleRef?: Ref<MaskBrushHandle | null>;
  onStateChange?: (state: MaskBrushState) => void;
  onMaskChange?: () => void;
};

const emptyState = (): MaskBrushState => ({
  canUndo: false,
  canRedo: false,
  hasMask: false,
});

function paintPoint(
  ctx: CanvasRenderingContext2D,
  point: Point,
  radius: number
) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(point.x, point.y, Math.max(1, radius), 0, Math.PI * 2);
  ctx.fill();
}

function paintSegment(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  radius: number
) {
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(2, radius * 2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

/**
 * Store source-image-space stroke paths, not a full ImageData snapshot after
 * each stroke. On a 12 MP image, 40 RGBA snapshots would consume ~1.8 GiB.
 */
export function useMaskBrush({
  imageSrc,
  enabled,
  brushSize,
  handleRef,
  onStateChange,
  onMaskChange,
}: Options) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  // Transparent canvas: only the painted strokes have alpha.
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const strokes = useRef<Stroke[]>([]);
  const redoStack = useRef<Stroke[]>([]);
  const activeStroke = useRef<Stroke | null>(null);
  const activePointer = useRef<number | null>(null);
  const onStateChangeRef = useRef(onStateChange);
  const onMaskChangeRef = useRef(onMaskChange);
  onStateChangeRef.current = onStateChange;
  onMaskChangeRef.current = onMaskChange;

  const [layout, setLayout] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    naturalWidth: 0,
    naturalHeight: 0,
  });
  const [state, setState] = useState<MaskBrushState>(emptyState);
  const stateRef = useRef<MaskBrushState>(emptyState());

  const publish = useCallback(() => {
    const next = {
      canUndo: strokes.current.length > 0,
      canRedo: redoStack.current.length > 0,
      hasMask: strokes.current.length > 0,
    };
    const previous = stateRef.current;
    if (
      previous.canUndo === next.canUndo &&
      previous.canRedo === next.canRedo &&
      previous.hasMask === next.hasMask
    ) {
      return;
    }
    stateRef.current = next;
    setState(next);
    onStateChangeRef.current?.(next);
  }, []);

  const notifyMaskChange = useCallback(() => {
    onMaskChangeRef.current?.();
  }, []);

  const paintOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const mask = maskRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!mask) return;
    // Recolor the white strokes without per-pixel getImageData on every move.
    ctx.drawImage(mask, 0, 0, overlay.width, overlay.height);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.58)';
    ctx.fillRect(0, 0, overlay.width, overlay.height);
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const ensureMask = useCallback((width: number, height: number) => {
    let mask = maskRef.current;
    if (!mask || mask.width !== width || mask.height !== height) {
      mask = document.createElement('canvas');
      mask.width = width;
      mask.height = height;
      maskRef.current = mask;
      strokes.current = [];
      redoStack.current = [];
      activeStroke.current = null;
      activePointer.current = null;
    }
    return mask;
  }, []);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const image = imageRef.current;
    if (!container || !image || !image.naturalWidth) return;
    const cRect = container.getBoundingClientRect();
    const iRect = image.getBoundingClientRect();
    const next = {
      left: iRect.left - cRect.left,
      top: iRect.top - cRect.top,
      width: iRect.width,
      height: iRect.height,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    };
    ensureMask(next.naturalWidth, next.naturalHeight);
    setLayout((previous) =>
      Object.keys(next).every(
        (key) =>
          previous[key as keyof typeof previous] ===
          next[key as keyof typeof next]
      )
        ? previous
        : next
    );
  }, [ensureMask]);

  useEffect(() => {
    strokes.current = [];
    redoStack.current = [];
    activeStroke.current = null;
    activePointer.current = null;
    maskRef.current = null;
    publish();
    paintOverlay();
    measure();
  }, [imageSrc, measure, paintOverlay, publish]);

  useEffect(() => {
    measure();
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure, imageSrc]);

  // The overlay is conditionally mounted after the first image measurement.
  // Paint it after that commit, not only from the earlier onLoad callback.
  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || layout.width <= 0 || layout.height <= 0) return;
    const width = Math.max(1, Math.round(layout.width));
    const height = Math.max(1, Math.round(layout.height));
    if (overlay.width !== width) overlay.width = width;
    if (overlay.height !== height) overlay.height = height;
    paintOverlay();
  }, [layout.width, layout.height, paintOverlay]);

  const replayStrokes = useCallback(() => {
    const mask = maskRef.current;
    if (!mask) return;
    const ctx = mask.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, mask.width, mask.height);
    for (const stroke of strokes.current) {
      if (!stroke.points.length) continue;
      paintPoint(ctx, stroke.points[0], stroke.radius);
      for (let i = 1; i < stroke.points.length; i++) {
        paintSegment(ctx, stroke.points[i - 1], stroke.points[i], stroke.radius);
      }
    }
    paintOverlay();
  }, [paintOverlay]);

  const strokeAt = (clientX: number, clientY: number) => {
    const overlay = overlayRef.current;
    const mask = maskRef.current;
    const stroke = activeStroke.current;
    if (!overlay || !mask || !stroke) return;
    const rect = overlay.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const point = {
      x: Math.max(0, Math.min(mask.width, ((clientX - rect.left) / rect.width) * mask.width)),
      y: Math.max(0, Math.min(mask.height, ((clientY - rect.top) / rect.height) * mask.height)),
    };
    const previous = stroke.points.at(-1);
    if (previous && previous.x === point.x && previous.y === point.y) return;
    stroke.points.push(point);
    const ctx = mask.getContext('2d');
    if (!ctx) return;
    if (previous) paintSegment(ctx, previous, point, stroke.radius);
    else paintPoint(ctx, point, stroke.radius);
    paintOverlay();
  };

  const commitStroke = () => {
    const stroke = activeStroke.current;
    activeStroke.current = null;
    activePointer.current = null;
    if (!stroke?.points.length) return;
    strokes.current.push(stroke);
    redoStack.current = [];
    publish();
    notifyMaskChange();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!enabled || activeStroke.current) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const mask = maskRef.current;
    const overlay = overlayRef.current;
    if (!mask || !overlay) return;
    const displayedWidth = overlay.getBoundingClientRect().width;
    if (displayedWidth <= 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    activeStroke.current = {
      radius: Math.max(1, (brushSize / 2) * (mask.width / displayedWidth)),
      points: [],
    };
    strokeAt(event.clientX, event.clientY);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!enabled || activePointer.current !== event.pointerId) return;
    strokeAt(event.clientX, event.clientY);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== event.pointerId) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    commitStroke();
  };

  const undo = useCallback(() => {
    if (!strokes.current.length) return;
    redoStack.current.push(strokes.current.pop()!);
    replayStrokes();
    publish();
    notifyMaskChange();
  }, [replayStrokes, publish, notifyMaskChange]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    strokes.current.push(next);
    replayStrokes();
    publish();
    notifyMaskChange();
  }, [replayStrokes, publish, notifyMaskChange]);

  const clear = useCallback(() => {
    if (!strokes.current.length && !redoStack.current.length && !activeStroke.current) return;
    strokes.current = [];
    redoStack.current = [];
    activeStroke.current = null;
    activePointer.current = null;
    const mask = maskRef.current;
    if (mask) {
      mask.getContext('2d')?.clearRect(0, 0, mask.width, mask.height);
    }
    paintOverlay();
    publish();
    notifyMaskChange();
  }, [paintOverlay, publish, notifyMaskChange]);

  const exportMaskBlob = useCallback(async (): Promise<Blob | null> => {
    const mask = maskRef.current;
    if (!mask || strokes.current.length === 0) return null;
    // Fal requires opaque black where the source must be kept.
    const output = document.createElement('canvas');
    output.width = mask.width;
    output.height = mask.height;
    const ctx = output.getContext('2d');
    if (!ctx) throw new Error('Unable to create the precision mask');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, output.width, output.height);
    ctx.drawImage(mask, 0, 0);
    return new Promise<Blob>((resolve, reject) => {
      output.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error('Unable to export the precision mask')),
        'image/png'
      );
    });
  }, []);

  const hasMask = useCallback(() => strokes.current.length > 0, []);

  useImperativeHandle(
    handleRef,
    () => ({ undo, redo, clear, exportMaskBlob, hasMask }),
    [undo, redo, clear, exportMaskBlob, hasMask]
  );

  return {
    containerRef,
    imageRef,
    overlayRef,
    layout,
    state,
    measure,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    undo,
    redo,
    clear,
  };
}
