import { createFileRoute } from '@tanstack/react-router';
import { NO_STORE, readGalleryMedia } from '@/modules/prompt-gallery/service';

async function GET({ request }: { request: Request }) {
  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  const index = params.get('index') ?? '';
  const variant = params.get('variant') ?? 'thumbnail';
  if (!id || id.length > 256 || !/^\d{1,4}$/.test(index) || !['thumbnail','original'].includes(variant)) return new Response(null, { status: 400, headers: NO_STORE });
  try {
    return await readGalleryMedia(id, Number(index), variant === 'thumbnail', request);
  } catch (error) {
    console.error('Prompt gallery media unavailable', error);
    return new Response(null, { status: 503, headers: NO_STORE });
  }
}
export const Route = createFileRoute('/api/prompt-gallery/media')({ server: { handlers: { GET } } });
