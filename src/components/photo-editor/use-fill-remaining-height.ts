import { useEffect, useRef, useState } from 'react';

/**
 * Caps an element to the remaining viewport below its top edge so a pinned
 * footer (e.g. Generate) stays on screen while the body scrolls inside.
 */
export function useFillRemainingHeight<T extends HTMLElement>(
  bottomPadPx = 16,
  minHeightPx = 280
) {
  const ref = useRef<T | null>(null);
  const [maxHeight, setMaxHeight] = useState<number | undefined>();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const top = el.getBoundingClientRect().top;
      setMaxHeight(
        Math.max(
          minHeightPx,
          Math.floor(window.innerHeight - top - bottomPadPx)
        )
      );
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [bottomPadPx, minHeightPx]);

  return { ref, maxHeight };
}
