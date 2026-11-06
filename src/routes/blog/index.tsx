import { createFileRoute } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { pageHead } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { BlogCard } from '@/components/blog-card';
import { formatPostDate } from '@/content/posts';
import { getBlogPostsFn, getGuestPostsOpenFn } from '@/content/posts/server';

export const Route = createFileRoute('/blog/')({
  loader: async () => {
    const locale = getLocale();
    const [posts, guestPostsOpen] = await Promise.all([
      getBlogPostsFn({ data: { locale } }),
      getGuestPostsOpenFn(),
    ]);
    return { locale, posts, guestPostsOpen };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale;
    return pageHead({
      title: `${m['blog.title']({}, { locale: locale as any })} | ${envConfigs.app_name}`,
      description: m['blog.description']({}, { locale: locale as any }),
      path: '/blog',
      locale,
      localized: true,
    });
  },
  component: BlogPage,
});

function BlogPage() {
  const { locale, posts, guestPostsOpen } = Route.useLoaderData();

  return (
    <div className="force-light flex min-h-screen flex-col bg-[#f7f9fc] text-slate-900">
      <Header />
      <main className="flex-1 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h1 className="font-serif text-4xl font-normal tracking-tight sm:text-5xl">
              {m['blog.title']()}
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-slate-600">
              {m['blog.description']()}
            </p>
            {guestPostsOpen && (
              <Link
                href="/guest-post"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
              >
                {m['blog.write_for_us']()}
                <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>
          {posts.length === 0 ? (
            <p className="text-center text-slate-600">{m['blog.no_posts']()}</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <BlogCard
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  title={post.title}
                  description={post.description}
                  image={post.image}
                  date={formatPostDate(post.createdAt, locale)}
                  authorName={post.authorName}
                  authorImage={post.authorImage}
                  badge={post.sponsored ? m['blog.sponsored']() : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
