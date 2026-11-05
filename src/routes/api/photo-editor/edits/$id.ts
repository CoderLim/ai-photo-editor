import { createFileRoute } from '@tanstack/react-router';
import { getAuth } from '@/core/auth';
import { AITaskStatus, findTask, updateTask } from '@/modules/ai-tasks/service';
import { createPhotoProvider, persistPhotoOutput } from '@/modules/photo-editor/service';
import { AIMediaType } from '@/core/ai';
import { respData, respErr } from '@/lib/resp';

async function GET({ request, params }: { request: Request; params: { id: string } }) {
  const user = (await getAuth().api.getSession({ headers: request.headers }))?.user;
  if (!user) return respErr('Unauthorized', { status: 401 });
  let task = await findTask(params.id);
  if (!task || task.userId !== user.id || !task.id.startsWith('edit_')) {
    return respErr('Task not found', { status: 404 });
  }

  let output: any = {};
  let options: any = {};
  try { output = JSON.parse(task.taskResult || '{}'); } catch { /* ignored */ }
  try { options = JSON.parse(task.options || '{}'); } catch { /* ignored */ }

  if (task.status === AITaskStatus.PENDING || task.status === AITaskStatus.PROCESSING) {
    if (!task.taskId) {
      // No provider reference after submission: cannot safely re-submit and
      // risk double-charging. Give the submit request time to persist its ID.
      const created = new Date(task.createdAt).getTime();
      if (Date.now() - created > 180000) {
        await updateTask({ taskId: task.id, status: AITaskStatus.FAILED });
        task = (await findTask(task.id))!;
      }
    } else {
      try {
        const provider = await createPhotoProvider(task.provider);
        const remote = await provider.instance.query!({
          taskId: task.taskId,
          mediaType: AIMediaType.IMAGE,
          model: task.model,
        });
        if (remote.taskStatus === AITaskStatus.SUCCESS) {
          const original = remote.taskInfo?.images?.[0]?.imageUrl;
          if (!original) throw new Error('No output image');
          const stored = await persistPhotoOutput(original, task.id);
          output = { images: [{ imageUrl: stored }] };
          await updateTask({ taskId: task.id, status: AITaskStatus.SUCCESS, taskResult: output });
          task = (await findTask(task.id))!;
        } else if (remote.taskStatus === AITaskStatus.FAILED ||
                   remote.taskStatus === AITaskStatus.CANCELED) {
          await updateTask({ taskId: task.id, status: AITaskStatus.FAILED });
          task = (await findTask(task.id))!;
        }
      } catch (error: any) {
        // A network/storage problem is not a definitive remote failure.
        // Keep the existing job and retry polling later; never create a new one.
        console.warn('Photo edit status query failed:', error?.message || error);
      }
    }
  }

  return respData({
    jobId: task.id,
    status: task.status,
    imageUrl: output.images?.[0]?.imageUrl || null,
    originalUrl: options.imageUrl || null,
    prompt: task.prompt,
    credits: task.costCredits,
  });
}

export const Route = createFileRoute('/api/photo-editor/edits/$id')({
  server: { handlers: { GET } },
});
