import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Check, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import type { GalleryCard, GalleryPage } from '@/modules/prompt-gallery/types';
import { apiGet } from '@/lib/api-client';
import { pageHead } from '@/lib/seo';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { ImageLightbox } from '@/components/image-lightbox';
import { distributeMasonry } from '@/components/prompt-gallery/masonry';

import { AiPhotoPromptsSeo, promptsSeoJsonLd } from './-ai-photo-prompts-seo';

const title = 'AI Photo Prompts: 2000+ Copy-and-Paste Prompts';
const description =
  'Browse 2000+ AI photo prompts you can copy and paste — portraits, backgrounds, outfits, product shots and restyles. Paste one, edit your own photo, no sign-up.';
const ogImage = '/images/ai-photo-editor/ai-photo-prompts/og-cover.png';

const loadInitialGalleryPage = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GalleryPage | null> => {
    try {
      const { getGalleryPage } =
        await import('@/modules/prompt-gallery/service');
      return await getGalleryPage(0);
    } catch {
      // Local node/dev without Cloudflare bindings — client fetch will retry.
      return null;
    }
  }
);

function PromptTile({
  item,
  priority,
}: {
  item: GalleryCard;
  priority?: boolean;
}) {
  const [copyState, setCopyState] = useState<'idle' | 'loading' | 'copied'>(
    'idle'
  );
  const [manual, setManual] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const busy = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (manual !== null) textarea.current?.select();
  }, [manual]);

  async function copyPrompt(e: MouseEvent) {
    e.stopPropagation();
    if (busy.current) return;
    busy.current = true;
    clearTimeout(timer.current);
    setCopyState('loading');
    const promise = apiGet<{ prompt: string }>(
      '/api/prompt-gallery/prompt?' + new URLSearchParams({ id: item.id })
    ).then((data) => data.prompt);
    try {
      // Start the clipboard write within the click gesture (including Safari).
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': promise.then(
              (value) => new Blob([value], { type: 'text/plain' })
            ),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(await promise);
      }
      setCopyState('copied');
      toast.success('Prompt copied');
      timer.current = setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      try {
        setManual(await promise);
        toast.info('Select and copy the prompt manually.');
      } catch {
        toast.error('Could not load this prompt. Please try again.');
      }
      setCopyState('idle');
    } finally {
      busy.current = false;
    }
  }

  const ratio =
    item.width && item.height ? item.width / item.height : undefined;

  return (
    <article className="group relative isolate overflow-hidden bg-slate-100">
      {broken ? (
        <div
          className="flex min-h-24 items-center justify-center p-4 text-center text-sm text-slate-500"
          style={{ aspectRatio: ratio ?? 1 }}
        >
          Image unavailable
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          aria-label={'View ' + item.title + ' fullscreen'}
          className="block w-full cursor-zoom-in p-0"
        >
          <img
            src={item.imageUrl}
            alt={item.title}
            width={item.width}
            height={item.height}
            className="block h-auto w-full"
            style={ratio ? { aspectRatio: ratio } : undefined}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : undefined}
            onError={() => setBroken(true)}
          />
        </button>
      )}
      <button
        type="button"
        onClick={copyPrompt}
        disabled={copyState === 'loading'}
        aria-label={'Copy prompt: ' + item.title}
        className="absolute top-2 right-2 z-10 inline-flex size-9 items-center justify-center rounded-full bg-black/45 text-white opacity-100 shadow-sm backdrop-blur-[2px] transition-opacity focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-white [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100"
      >
        {copyState === 'loading' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : copyState === 'copied' ? (
          <Check className="size-4" />
        ) : (
          <Copy className="size-4" />
        )}
      </button>
      {manual !== null && (
        <div className="absolute inset-0 z-20 flex flex-col gap-2 bg-black/90 p-3 text-white">
          <label className="text-xs font-medium" htmlFor={'prompt-' + item.id}>
            Copy prompt manually
          </label>
          <textarea
            ref={textarea}
            id={'prompt-' + item.id}
            readOnly
            value={manual}
            className="min-h-0 flex-1 resize-none rounded border border-white/40 p-2 text-sm"
          />
          <button
            type="button"
            className="self-end rounded bg-white px-3 py-1 text-black"
            onClick={() => setManual(null)}
          >
            Close
          </button>
        </div>
      )}
      {previewOpen && !broken ? (
        <ImageLightbox
          src={item.imageUrl}
          alt={item.title}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </article>
  );
}

function Gallery() {
  const initialPage = Route.useLoaderData();
  const query = useInfiniteQuery({
    queryKey: ['public-photo-prompts'],
    queryFn: ({ pageParam, signal }) =>
      apiGet<GalleryPage>('/api/prompt-gallery/list?offset=' + pageParam, {
        signal,
        cache: 'no-store',
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    initialData: initialPage
      ? { pages: [initialPage], pageParams: [0] }
      : undefined,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const sentinel = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(2);
  useEffect(() => {
    const el = grid.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      setCount(width >= 1440 ? 5 : width >= 1100 ? 4 : width >= 700 ? 3 : 2);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const { hasNextPage, isFetching, isError, fetchNextPage, data } = query;
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage || isFetching || isError) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void fetchNextPage({ cancelRefetch: false });
        }
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, isError, fetchNextPage, data]);

  const items = useMemo(() => {
    const seen = new Set<string>();
    return (data?.pages.flatMap((page) => page.items) ?? []).filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [data]);
  const columns = useMemo(
    () => distributeMasonry(items, count),
    [items, count]
  );
  const priorityIds = useMemo(
    () =>
      new Set(items.slice(0, Math.min(count * 2, 10)).map((item) => item.id)),
    [items, count]
  );

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <Header />
      <main>
        <section className="px-4 py-4 text-center sm:py-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            AI Photo Prompts
          </h1>
          <p className="mx-auto mt-1.5 max-w-2xl text-sm text-slate-600">
            Browse examples, copy a prompt, and run it on your own photo — no
            sign-up to try.
          </p>
        </section>
        <div
          ref={grid}
          className="grid w-full items-start gap-0"
          style={{
            gridTemplateColumns: 'repeat(' + count + ', minmax(0, 1fr))',
          }}
        >
          {columns.map((column, index) => (
            <div key={index} className="min-w-0">
              {column.map((item) => (
                <PromptTile
                  key={item.id}
                  item={item}
                  priority={priorityIds.has(item.id)}
                />
              ))}
            </div>
          ))}
        </div>
        <div
          ref={sentinel}
          className="flex min-h-24 flex-col items-center justify-center gap-3 px-4 py-6 text-center text-sm text-slate-500"
          aria-live="polite"
        >
          {isFetching && (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading prompts…
            </span>
          )}
          {isError && (
            <>
              <p>Could not load prompts. Please try again.</p>
              <button
                type="button"
                className="rounded-md border px-4 py-2"
                onClick={() => void (data ? fetchNextPage() : query.refetch())}
              >
                Retry
              </button>
            </>
          )}
          {!isFetching && !isError && hasNextPage && (
            <button
              type="button"
              className="rounded-md border px-4 py-2"
              onClick={() => void fetchNextPage({ cancelRefetch: false })}
            >
              Load more
            </button>
          )}
          {!isFetching &&
            !isError &&
            !hasNextPage &&
            (items.length
              ? 'You’ve reached the end.'
              : 'No published prompts available yet.')}
        </div>
        <AiPhotoPromptsSeo />
      </main>
      <Footer />
    </div>
  );
}

export const Route = createFileRoute('/ai-photo-prompts')({
  loader: () => loadInitialGalleryPage(),
  head: () => ({
    ...pageHead({
      title,
      description,
      path: '/ai-photo-prompts',
      image: ogImage,
    }),
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(promptsSeoJsonLd()),
      },
    ],
  }),
  component: Gallery,
});
