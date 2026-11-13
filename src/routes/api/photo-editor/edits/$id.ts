import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { findTask } from '@/modules/ai-tasks/service';
import { reconcilePhotoEditTask } from '@/modules/photo-editor/reconcile';
import { respData, respErr } from '@/lib/resp';

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
  let task = await findTask(params.id);
  if (!task || task.userId !== user.id || !task.id.startsWith('edit_')) {
    return respErr('Task not found', { status: 404 });
  }

  task = await reconcilePhotoEditTask(task);

  let output: { images?: { imageUrl?: string }[]; error?: string } = {};
  let options: { imageUrl?: string } = {};
  try {
    output = JSON.parse(task.taskResult || '{}');
  } catch {
    /* ignored */
  }
  try {
    options = JSON.parse(task.options || '{}');
  } catch {
    /* ignored */
  }

  return respData({
    jobId: task.id,
    status: task.status,
    imageUrl: output.images?.[0]?.imageUrl || null,
    originalUrl: options.imageUrl || null,
    prompt: task.prompt,
    credits: task.costCredits,
    error: typeof output.error === 'string' ? output.error : null,
  });
}

export const Route = createFileRoute('/api/photo-editor/edits/$id')({
  server: { handlers: { GET } },
});
