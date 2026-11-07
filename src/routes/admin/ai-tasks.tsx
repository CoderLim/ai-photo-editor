import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { tDynamic } from '@/core/i18n/dynamic';
import { apiGet, type PageResult } from '@/lib/api-client';
import { formatDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserCell } from '@/components/user-cell';

type TaskStatus = 'pending' | 'processing' | 'success' | 'failed' | 'canceled';
type Tab = 'all' | TaskStatus;

interface AiTaskRow {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  userImage: string | null;
  mediaType: string;
  provider: string;
  model: string;
  prompt: string;
  status: TaskStatus;
  costCredits: number;
  tool: string | null;
  quality: string | null;
  originalUrl: string | null;
  resultUrl: string | null;
  taskId: string | null;
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 20;
const TABS: Tab[] = [
  'all',
  'pending',
  'processing',
  'success',
  'failed',
  'canceled',
];

const STATUS_BADGE: Record<
  TaskStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  pending: 'secondary',
  processing: 'default',
  success: 'outline',
  failed: 'destructive',
  canceled: 'secondary',
};

function Thumb({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          'bg-muted text-muted-foreground flex items-center justify-center rounded-md text-xs',
          className
        )}
      >
        —
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={cn('border-border rounded-md border object-cover', className)}
    />
  );
}

function AiTasksPage() {
  const initialSearch = Route.useSearch().search ?? '';
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [active, setActive] = useState<AiTaskRow | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [tab, debouncedSearch]);

  const query = useQuery({
    queryKey: ['admin-ai-tasks', page, tab, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (tab !== 'all') params.set('status', tab);
      if (debouncedSearch) params.set('search', debouncedSearch);
      return apiGet<PageResult<AiTaskRow>>(`/api/admin/ai-tasks?${params}`);
    },
    placeholderData: keepPreviousData,
  });

  const tasks = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  const columns: Column<AiTaskRow>[] = [
    {
      header: m['admin.ai_tasks.preview'](),
      cell: (t) => (
        <button
          type="button"
          onClick={() => setActive(t)}
          className="flex items-center gap-1.5"
        >
          <Thumb src={t.originalUrl} alt="" className="size-10" />
          <Thumb src={t.resultUrl} alt="" className="size-10" />
        </button>
      ),
    },
    {
      header: m['admin.ai_tasks.user'](),
      cell: (t) => (
        <UserCell
          userId={t.userId}
          name={t.userName}
          email={t.userEmail}
          image={t.userImage}
        />
      ),
    },
    {
      header: m['admin.ai_tasks.prompt'](),
      cell: (t) => (
        <button
          type="button"
          onClick={() => setActive(t)}
          className="text-muted-foreground hover:text-foreground block max-w-[260px] truncate text-left text-sm"
          title={t.prompt}
        >
          {t.prompt || '—'}
        </button>
      ),
    },
    {
      header: m['admin.ai_tasks.status'](),
      cell: (t) => (
        <Badge variant={STATUS_BADGE[t.status] ?? 'secondary'}>
          {tDynamic(`admin.ai_tasks.status_${t.status}`)}
        </Badge>
      ),
    },
    {
      header: m['admin.ai_tasks.tool'](),
      cell: (t) => t.tool || '—',
    },
    {
      header: m['admin.ai_tasks.credits'](),
      cell: (t) => t.costCredits,
    },
    {
      header: m['admin.ai_tasks.provider'](),
      cell: (t) => (
        <span className="text-muted-foreground text-xs">
          {t.provider}
          {t.quality ? ` · ${t.quality}` : ''}
        </span>
      ),
    },
    {
      header: m['admin.ai_tasks.created_at'](),
      cell: (t) => (
        <span className="text-muted-foreground text-sm">
          {formatDateTime(t.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{m['admin.ai_tasks.title']()}</h1>
        <p className="text-muted-foreground">
          {m['admin.ai_tasks.description']()}
        </p>
      </div>

      <div className="border-border flex gap-1 overflow-x-auto overflow-y-hidden border-b">
        {TABS.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              tab === tb
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            {tDynamic(`admin.ai_tasks.tab_${tb}`)}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={tasks}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            rowKey={(t) => t.id}
            emptyText={m['admin.ai_tasks.no_tasks']()}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={m['admin.ai_tasks.search_placeholder']()}
            onRefresh={() => query.refetch()}
            loading={query.isFetching || query.isPending}
          />
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-3xl">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{m['admin.ai_tasks.detail_title']()}</DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {active.id}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                      {m['admin.ai_tasks.original']()}
                    </p>
                    <Thumb
                      src={active.originalUrl}
                      alt={m['admin.ai_tasks.original']()}
                      className="aspect-square w-full"
                    />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                      {m['admin.ai_tasks.result']()}
                    </p>
                    <Thumb
                      src={active.resultUrl}
                      alt={m['admin.ai_tasks.result']()}
                      className="aspect-square w-full"
                    />
                  </div>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">
                      {m['admin.ai_tasks.user']()}:{' '}
                    </span>
                    {active.userEmail || active.userName || active.userId}
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {m['admin.ai_tasks.status']()}:{' '}
                    </span>
                    {tDynamic(`admin.ai_tasks.status_${active.status}`)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {m['admin.ai_tasks.tool']()}:{' '}
                    </span>
                    {active.tool || '—'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {m['admin.ai_tasks.credits']()}:{' '}
                    </span>
                    {active.costCredits}
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {m['admin.ai_tasks.provider']()}:{' '}
                    </span>
                    {active.provider} / {active.model}
                    {active.quality ? ` · ${active.quality}` : ''}
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {m['admin.ai_tasks.created_at']()}:{' '}
                    </span>
                    {formatDateTime(active.createdAt)}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                    {m['admin.ai_tasks.prompt']()}
                  </p>
                  <p className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap">
                    {active.prompt || '—'}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute('/admin/ai-tasks')({
  validateSearch: (search: Record<string, unknown>): { search?: string } =>
    typeof search.search === 'string' && search.search
      ? { search: search.search }
      : {},
  component: AiTasksPage,
});
