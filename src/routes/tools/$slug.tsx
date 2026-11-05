import { createFileRoute, redirect } from '@tanstack/react-router';

import { getPhotoTool } from '@/modules/photo-editor/config';

/** Phase 1: tool detail pages redirect to the homepage editor hero. */
export const Route = createFileRoute('/tools/$slug')({
  beforeLoad: ({ params }) => {
    if (!getPhotoTool(params.slug)) {
      throw redirect({ to: '/' });
    }
    throw redirect({ to: '/', hash: 'editor' });
  },
});
