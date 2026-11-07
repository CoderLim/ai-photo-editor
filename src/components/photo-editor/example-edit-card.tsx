import type { ExampleEdit } from '@/modules/photo-editor/example-edits';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function Panel({
  src,
  alt,
  label,
}: {
  src: string;
  alt: string;
  label: 'Before' | 'After';
}) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-xl bg-slate-100">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="aspect-[4/5] w-full object-cover"
      />
      <span
        className={
          'absolute bottom-2 left-2 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm ' +
          (label === 'Before' ? 'bg-slate-900/70' : 'bg-blue-600')
        }
      >
        {label}
      </span>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function ExampleEditCard({ example }: { example: ExampleEdit }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="sr-only">{example.title}</h2>
      <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:gap-3">
        <Panel src={example.beforeSrc} alt={example.beforeAlt} label="Before" />
        <Panel src={example.afterSrc} alt={example.afterAlt} label="After" />
      </div>
      <p
        className="mt-4 line-clamp-2 min-h-[2.75rem] text-sm leading-[1.375rem] text-slate-600"
        title={example.prompt}
      >
        {example.prompt}
      </p>
      <div className="mt-auto flex items-center gap-3 border-t border-slate-100 pt-4">
        <Avatar className="size-10 shrink-0">
          <AvatarImage src={example.userAvatar} alt={example.userName} />
          <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-600">
            {initials(example.userName)}
          </AvatarFallback>
        </Avatar>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
          {example.userName}
        </p>
        <p className="shrink-0 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">
            {example.credits}
          </span>{' '}
          credits
        </p>
      </div>
    </article>
  );
}
