import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { baseLocale } from '@/paraglide/runtime.js';
import { getLocalPosts, mergePosts } from '@/content/posts';

const STATIC_PAGES: { path: string; title: string; description: string }[] = [
  {
    path: '',
    title: 'AI Photo Editor',
    description: 'Free AI photo editor online with natural-language prompts',
  },
  {
    path: '/pricing',
    title: 'Pricing',
    description: 'AI photo editor credit packs — pay once',
  },
  {
    path: '/tools',
    title: 'AI Photo Tools',
    description: 'Task-focused AI photo editor tools',
  },
  { path: '/blog', title: 'Blog', description: 'Guides and product notes' },
  {
    path: '/ai-background-remover',
    title: 'AI Background Remover',
    description:
      'Remove photo backgrounds and download transparent PNG cutouts',
  },
  {
    path: '/photo-background-changer',
    title: 'Photo Background Changer',
    description: 'Change photo backgrounds to a color, preset, or custom image',
  },
  {
    path: '/examples',
    title: 'AI Photo Edit Examples',
    description:
      'Curated before/after AI photo edits with prompts and credit costs',
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy',
    description: 'How we handle your data',
  },
  {
    path: '/terms-of-service',
    title: 'Terms of Service',
    description: 'Terms for using the service',
  },
  {
    path: '/acceptable-use-policy',
    title: 'Acceptable Use Policy',
    description:
      'Prohibited content categories, reporting, and moderation for AI image edits',
  },
];

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: async () => {
        const { app_url, app_name, app_description } = envConfigs;

        let posts = getLocalPosts(baseLocale);
        try {
          const { listPublishedArticles } =
            await import('@/modules/posts/service');
          const rows = await listPublishedArticles().catch(() => []);
          const dbPosts = rows.map((row) => ({
            slug: row.slug,
            title: row.title || row.slug,
            description: row.description || '',
            createdAt: new Date(row.createdAt).toISOString(),
            source: 'db' as const,
          }));
          posts = mergePosts(dbPosts, posts);
        } catch {
          // Database unreachable — local posts still listed.
        }

        const lines: string[] = [
          `# ${app_name}`,
          '',
          `> ${app_description}`,
          '',
          '## Pages',
          '',
          ...STATIC_PAGES.map(
            (p) => `- [${p.title}](${app_url}${p.path}): ${p.description}`
          ),
        ];

        if (posts.length > 0) {
          lines.push('', '## Blog Posts', '');
          for (const post of posts) {
            lines.push(
              `- [${post.title}](${app_url}/blog/${post.slug}): ${post.description}`
            );
          }
        }

        lines.push('');

        return new Response(lines.join('\n'), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      },
    },
  },
});
