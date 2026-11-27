import { createFileRoute } from '@tanstack/react-router';
import { respData, respErr } from '@/lib/resp';
import { getGalleryPage, NO_STORE } from '@/modules/prompt-gallery/service';

async function GET({ request }: { request: Request }) {
  const raw = new URL(request.url).searchParams.get('offset') ?? '0';
  if (!/^\d{1,7}$/.test(raw)) return respErr('Invalid offset', { status: 400, headers: NO_STORE });
  try {
    return respData(await getGalleryPage(Number(raw)), { headers: NO_STORE });
  } catch (error) {
    console.error('Prompt gallery list unavailable', error);
    return respErr('Prompt gallery is temporarily unavailable.', { status: 503, headers: NO_STORE });
  }
}
export const Route = createFileRoute('/api/prompt-gallery/list')({ server: { handlers: { GET } } });
