import { createFileRoute } from '@tanstack/react-router';
import { respData, respErr } from '@/lib/resp';
import { getPromptById, NO_STORE, selectCover } from '@/modules/prompt-gallery/service';

async function GET({ request }: { request: Request }) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id || id.length > 256) return respErr('Invalid prompt ID', { status: 400, headers: NO_STORE });
  try {
    const row = await getPromptById(id);
    if (!row || row.mediaType !== 'image' || !selectCover(row.media)) return respErr('Prompt not found', { status: 404, headers: NO_STORE });
    return respData({ prompt: row.prompt }, { headers: NO_STORE });
  } catch (error) {
    console.error('Prompt gallery detail unavailable', error);
    return respErr('Prompt is temporarily unavailable.', { status: 503, headers: NO_STORE });
  }
}
export const Route = createFileRoute('/api/prompt-gallery/prompt')({ server: { handlers: { GET } } });
