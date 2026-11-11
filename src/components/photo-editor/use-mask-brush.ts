import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react';

const MAX_HISTORY = 40;

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

type Options = {
  imageSrc: string;
  enabled: boolean;
  brushSize: number;
  handleRef?: Ref<MaskBrushHandle | null>;
  onStateChange?: (state: MaskBrushState) => void;
};

function emptyState(): MaskBrushState {
  return { canUndo: false, canRedo: false, hasMask: false };
}

/** Precision-edit mask stroke history at the source image's natural size. */
export function useMaskBrush({
  imageSrc,
  enabled,
  brushSize,
  handleRef,
  onStateChange,
}: Options) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const history = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const [layout, setLayout] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    naturalWidth: 0,
    naturalHeight: 0,
  });
  const [state, setState] = useState<MaskBrushState>(emptyState);

  const publish = useCallback(() => {
    const mask = maskRef.current;
    let hasMask = false;
    if (mask && mask.width > 0) {
      const data = mask
        .getContext('2d')!
        .getImageData(0, 0, mask.width, mask.height).data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 8) {
          hasMask = true;
          break;
        }
      }
    }
    const next = {
      canUndo: history.current.length > 1,
      canRedo: redoStack.current.length > 0,
      hasMask,
    };
    setState(next);
    onStateChange?.(next);
  }, [onStateChange]);

  const paintOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const mask = maskRef.current;
    if (!overlay || !mask || overlay.width === 0) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.drawImage(mask, 0, 0, overlay.width, overlay.height);
    const image = ctx.getImageData(0, 0, overlay.width, overlay.height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = data[i];
      if (v > 8) {
        data[i] = 239;
        data[i + 1] = 68;
        data[i + 2] = 68;
        data[i + 3] = Math.min(180, 40 + v);
      } else {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, []);

  const ensureMask = useCallback(
    (naturalWidth: number, naturalHeight: number) => {
      let mask = maskRef.current;
      if (
        !mask ||
        mask.width !== naturalWidth ||
        mask.height !== naturalHeight
      ) {
        mask = document.createElement('canvas');
        mask.width = naturalWidth;
        mask.height = naturalHeight;
        const ctx = mask.getContext('2d')!;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, naturalWidth, naturalHeight);
        maskRef.current = mask;
        history.current = [ctx.getImageData(0, 0, naturalWidth, naturalHeight)];
        redoStack.current = [];
      }
      return mask;
    },
    []
  );

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
    setLayout(next);
    ensureMask(next.naturalWidth, next.naturalHeight);
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.width = Math.max(1, Math.round(next.width));
      overlay.height = Math.max(1, Math.round(next.height));
      paintOverlay();
    }
    publish();
  }, [ensureMask, paintOverlay, publish]);

  useEffect(() => {
    measure();
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure, imageSrc]);

  useEffect(() => {
    history.current = [];
    redoStack.current = [];
    maskRef.current = null;
    setState(emptyState());
    onStateChange?.(emptyState());
    measure();
  }, [imageSrc]); // eslint-disable-line react-hooks/exhaustive-deps -- reset on new source only

  const strokeAt = (clientX: number, clientY: number) => {
    const overlay = overlayRef.current;
    const mask = maskRef.current;
    if (!overlay || !mask || layout.width <= 0) return;
    const rect = overlay.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * mask.width;
    const y = ((clientY - rect.top) / rect.height) * mask.height;
    const radius = (brushSize / 2) * (mask.width / Math.max(layout.width, 1));
    const ctx = mask.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, radius), 0, Math.PI * 2);
    ctx.fill();
    paintOverlay();
  };

  const commitStroke = () => {
    const mask = maskRef.current;
    if (!mask) return;
    const snapshot = mask
      .getContext('2d')!
      .getImageData(0, 0, mask.width, mask.height);
    history.current = [...history.current.slice(-(MAX_HISTORY - 1)), snapshot];
    redoStack.current = [];
    publish();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!enabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    strokeAt(event.clientX, event.clientY);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!enabled || !drawing.current) return;
    strokeAt(event.clientX, event.clientY);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    commitStroke();
  };

  const maskHasPaint = () => {
    const mask = maskRef.current;
    if (!mask || mask.width === 0) return false;
    const data = mask
      .getContext('2d')!
      .getImageData(0, 0, mask.width, mask.height).data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 8) return true;
    }
    return false;
  };

  const undo = useCallback(() => {
    const mask = maskRef.current;
    if (!mask || history.current.length <= 1) return;
    const current = history.current.pop()!;
    redoStack.current.push(current);
    const prev = history.current[history.current.length - 1];
    mask.getContext('2d')!.putImageData(prev, 0, 0);
    paintOverlay();
    publish();
  }, [paintOverlay, publish]);

  const redo = useCallback(() => {
    const mask = maskRef.current;
    const next = redoStack.current.pop();
    if (!mask || !next) return;
    history.current.push(next);
    mask.getContext('2d')!.putImageData(next, 0, 0);
    paintOverlay();
    publish();
  }, [paintOverlay, publish]);

  const clear = useCallback(() => {
    const mask = maskRef.current;
    if (!mask) return;
    const ctx = mask.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, mask.width, mask.height);
    history.current = [ctx.getImageData(0, 0, mask.width, mask.height)];
    redoStack.current = [];
    paintOverlay();
    publish();
  }, [paintOverlay, publish]);

  const exportMaskBlob = useCallback(async () => {
    const mask = maskRef.current;
    if (!mask || !maskHasPaint()) return null;
    return new Promise<Blob | null>((resolve) => {
      mask.toBlob((blob) => resolve(blob), 'image/png');
    });
  }, []);

  const hasMask = useCallback(() => maskHasPaint(), []);

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
