import { createFileRoute, redirect } from '@tanstack/react-router';

import { getPhotoTool } from '@/modules/photo-editor/config';

/** Keep legacy tool links working; dedicated tools have their own landing pages. */
export const Route = createFileRoute('/tools/$slug')({
  beforeLoad: ({ params }) => {
    if (params.slug === 'enhance-photo') {
      throw redirect({ to: '/ai-photo-enhancer' });
    }
    if (params.slug === 'change-background') {
      throw redirect({ to: '/photo-background-changer' });
    }
    if (params.slug === 'remove-background') {
      throw redirect({ to: '/ai-background-remover' });
    }
    if (params.slug === 'edit-text') {
      throw redirect({ to: '/photo-text-editor' });
    }
    if (params.slug === 'image-to-image') {
      // Typed route path omits the trailing slash; canonical/fullPath keep it.
      throw redirect({ to: '/image-to-image' });
    }
    if (!getPhotoTool(params.slug)) {
      throw redirect({ to: '/' });
    }
    throw redirect({ to: '/', hash: 'editor' });
  },
});
