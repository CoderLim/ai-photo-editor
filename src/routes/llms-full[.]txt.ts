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
    path: '/photo-text-editor',
    title: 'Photo Text Editor',
    description:
      'Edit text already inside a photo by describing the change; AI redraws the lettering',
  },
  {
    path: '/image-to-image/',
    title: 'Image to Image',
    description:
      'Upload a photo and describe a new look; AI redraws style while composition stays put',
  },
  {
    path: '/examples',
    title: 'AI Photo Edit Examples',
    description:
      'Curated before/after AI photo edits with prompts and credit costs',
  },
];

export const Route = createFileRoute('/llms-full.txt')({
  server: {
    handlers: {
      GET: async () => {
        const { app_url, app_name, app_description } = envConfigs;

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

        let posts = getLocalPosts(baseLocale);
        try {
          const { listPublishedArticles, findPublishedBySlug } =
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

          if (posts.length > 0) {
            lines.push('', '## Blog Posts', '');

            for (const post of posts) {
              lines.push(`### ${post.title}`, '');
              lines.push(`URL: ${app_url}/blog/${post.slug}`);
              if (post.description)
                lines.push(`Description: ${post.description}`);
              lines.push('');

              if (post.source === 'db') {
                const detail = await findPublishedBySlug(post.slug).catch(
                  () => null
                );
                if (detail?.content) {
                  lines.push(detail.content, '');
                }
              }

              lines.push('---', '');
            }
          }
        } catch {
          // Database unreachable — list local posts without content.
          if (posts.length > 0) {
            lines.push('', '## Blog Posts', '');
            for (const post of posts) {
              lines.push(`### ${post.title}`, '');
              lines.push(`URL: ${app_url}/blog/${post.slug}`);
              if (post.description)
                lines.push(`Description: ${post.description}`);
              lines.push('', '---', '');
            }
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
