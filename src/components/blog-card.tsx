import { Calendar } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';

export type BlogCardProps = {
  href: string;
  title: string;
  description?: string;
  image?: string;
  date?: string;
  authorName?: string;
  authorImage?: string;
  /** Small label above the title, e.g. "Sponsored". */
  badge?: string;
};

export function BlogCard({
  href,
  title,
  description,
  image,
  date,
  authorName,
  authorImage,
  badge,
}: BlogCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-blue-200 hover:shadow-md"
    >
      {image && (
        <img
          src={image}
          alt={title}
          width={640}
          height={360}
          loading="lazy"
          className="aspect-video w-full object-cover object-center"
        />
      )}
      <div className="flex flex-1 flex-col gap-3 p-6">
        {badge && (
          <span className="w-fit rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase">
            {badge}
          </span>
        )}
        <h3 className="leading-snug font-medium text-slate-900 group-hover:underline group-hover:underline-offset-4">
          {title}
        </h3>
        {description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
            {description}
          </p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-slate-500">
          {date && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {date}
            </span>
          )}
          <span className="flex-1" />
          {(authorName || authorImage) && (
            <span className="inline-flex items-center gap-2">
              {authorImage && (
                <img
                  src={authorImage}
                  alt={authorName || ''}
                  width={20}
                  height={20}
                  loading="lazy"
                  className="size-5 rounded-full object-cover"
                />
              )}
              {authorName}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
