import { useEffect, useMemo, useRef, useState } from 'react';
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
import { distributeMasonry } from '@/components/prompt-gallery/masonry';

const title = 'AI Photo Prompts – AI Image Prompt Gallery';
const description =
  'Explore AI photo prompts with example images. Browse the gallery and copy full original prompts for your next AI image or photo edit.';

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
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const busy = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (manual !== null) textarea.current?.select();
  }, [manual]);

  async function copyPrompt() {
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
  const attribution =
    item.author ||
    item.sourceUrl ||
    item.license === 'CC-BY-4.0' ||
    item.modifications;

  return (
    <article className="group bg-muted relative isolate overflow-hidden">
      {broken ? (
        <div
          className="text-muted-foreground flex min-h-24 items-center justify-center p-4 text-center text-sm"
          style={{ aspectRatio: ratio ?? 1 }}
        >
          Image unavailable
        </div>
      ) : (
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
      )}
      <button
        type="button"
        onClick={copyPrompt}
        disabled={copyState === 'loading'}
        aria-label={'Copy prompt: ' + item.title}
        className="absolute top-2 right-2 z-10 inline-flex min-h-10 items-center gap-1.5 rounded-md bg-black/75 px-3 text-xs font-medium text-white opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-white [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100"
      >
        {copyState === 'loading' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : copyState === 'copied' ? (
          <Check className="size-4" />
        ) : (
          <Copy className="size-4" />
        )}
        {copyState === 'loading'
          ? 'Copying…'
          : copyState === 'copied'
            ? 'Copied'
            : 'Copy'}
      </button>
      {attribution && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pt-6 pb-2 text-xs text-white opacity-100 transition-opacity [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100">
          <div className="pointer-events-auto flex flex-wrap items-center gap-x-2 gap-y-1">
            {item.author && <span>{item.author}</span>}
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Source
              </a>
            )}
            {item.license === 'CC-BY-4.0' && (
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                CC BY 4.0
              </a>
            )}
          </div>
          {item.modifications && <p className="mt-1">{item.modifications}</p>}
        </div>
      )}
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
    <div className="min-h-screen">
      <Header />
      <main>
        <section className="px-4 py-4 text-center sm:py-5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            AI Photo Prompts
          </h1>
          <p className="text-muted-foreground mx-auto mt-1.5 max-w-2xl text-sm">
            Find inspiration for your next image. Browse examples and copy the
            prompts you like.
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
          className="text-muted-foreground flex min-h-24 flex-col items-center justify-center gap-3 px-4 py-6 text-center text-sm"
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
      </main>
      <Footer />
    </div>
  );
}

export const Route = createFileRoute('/ai-photo-prompts')({
  loader: () => loadInitialGalleryPage(),
  head: () => pageHead({ title, description, path: '/ai-photo-prompts' }),
  component: Gallery,
});
