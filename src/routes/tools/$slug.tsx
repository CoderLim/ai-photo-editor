import { createFileRoute, redirect } from '@tanstack/react-router';

import { getPhotoTool } from '@/modules/photo-editor/config';

/** Keep legacy tool links working; the enhancer has its own landing page. */
export const Route = createFileRoute('/tools/$slug')({
  beforeLoad: ({ params }) => {
    if (params.slug === 'enhance-photo') {
      throw redirect({ to: '/ai-photo-enhancer' });
    }
    if (!getPhotoTool(params.slug)) {
      throw redirect({ to: '/' });
    }
    throw redirect({ to: '/', hash: 'editor' });
  },
});
