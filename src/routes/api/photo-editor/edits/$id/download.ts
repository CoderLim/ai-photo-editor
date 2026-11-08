import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { AITaskStatus, findTask } from '@/modules/ai-tasks/service';
import { getAllConfigs } from '@/modules/config/service';
import { respErr } from '@/lib/resp';

function attachmentFilename(tool?: string) {
  if (tool === 'remove-background') return 'background-removed.png';
  if (tool === 'enhance-photo') return 'enhanced-photo.png';
  return 'edited-photo.png';
}

/**
 * Same-origin attachment download for photo-edit results.
 * Cross-origin R2 URLs cannot use the HTML download attribute on mobile
 * Safari; this proxy forces Content-Disposition: attachment.
 * The object URL is checked against the server-managed R2 domain to avoid SSRF.
 */
async function GET({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const user = (await getAuth().api.getSession({ headers: request.headers }))
    ?.user;
  if (!user) return respErr('Unauthorized', { status: 401 });

  const task = await findTask(params.id);
  if (
    !task ||
    task.userId !== user.id ||
    !task.id.startsWith('edit_') ||
    task.status !== AITaskStatus.SUCCESS
  ) {
    return respErr('Image not found', { status: 404 });
  }

  let options: { tool?: string } = {};
  let output: { images?: { imageUrl?: string }[] } = {};
  try {
    options = JSON.parse(task.options || '{}');
    output = JSON.parse(task.taskResult || '{}');
  } catch {
    return respErr('Image not found', { status: 404 });
  }

  const url = output.images?.[0]?.imageUrl;
  const configs = await getAllConfigs();
  if (!url || !configs.r2_domain?.startsWith('https://')) {
    return respErr('Image unavailable', { status: 404 });
  }

  try {
    const expected = new URL(configs.r2_domain);
    const actual = new URL(url);
    if (
      actual.origin !== expected.origin ||
      !actual.pathname.startsWith(expected.pathname.replace(/\/$/, '') + '/')
    ) {
      return respErr('Image unavailable', { status: 404 });
    }
    const source = await fetch(actual.href);
    if (!source.ok || !source.body) {
      return respErr('Image unavailable', { status: 502 });
    }
    const filename = attachmentFilename(options.tool);
    return new Response(source.body, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return respErr('Image unavailable', { status: 502 });
  }
}

export const Route = createFileRoute('/api/photo-editor/edits/$id/download')({
  server: { handlers: { GET } },
});
