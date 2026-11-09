import { definePlugin } from 'nitro';

import { runWithDbScope } from '../../src/core/db/request-scope';

type CloudflareScheduledEvent = {
  controller?: unknown;
  env?: Record<string, unknown>;
  context?: { waitUntil: (promise: Promise<unknown>) => void };
};

/**
 * Cloudflare Cron Triggers invoke nitro's `scheduled` export, which only
 * fires the `cloudflare:scheduled` hook. Wire photo-edit stale reconcile here
 * (wrangler.jsonc `triggers.crons`).
 */
export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook(
    'cloudflare:scheduled' as any,
    (event: CloudflareScheduledEvent) => {
      if (event?.env) {
        (globalThis as any).__CF_ENV__ = event.env;
      }

      const run = runWithDbScope(async () => {
        const { reconcileStalePhotoEdits } =
          await import('../../src/modules/photo-editor/reconcile');
        const result = await reconcileStalePhotoEdits({ limit: 20 });
        console.log('cron reconcile-photo-edits', result);
      }).catch((error: unknown) => {
        console.error(
          'cron reconcile-photo-edits failed:',
          error instanceof Error ? error.message : error
        );
      });

      if (event?.context?.waitUntil) {
        event.context.waitUntil(run);
        return;
      }
      return run;
    }
  );
});
