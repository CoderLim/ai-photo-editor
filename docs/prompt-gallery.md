# Public AI photo prompts gallery

Page: /ai-photo-prompts. Source of truth: CoderLim/awesome-ai-image-prompts (D1 + private R2 sync). No business database migrations or writes.

## Bindings

The actual wrangler.jsonc is gitignored. Append to its existing d1_databases array:

```json
{ "binding": "PROMPTS_DB", "database_name": "prompts-db", "database_id": "YOUR_EXISTING_PROMPTS_DB_ID" }
```

Append to its existing r2_buckets array (create the array if absent):

```json
{ "binding": "PROMPT_MEDIA", "bucket_name": "prompt-media" }
```

Get the existing ID from Cloudflare D1 dashboard or `pnpm exec wrangler d1 list`. Do not replace DB or existing R2 entries. Do not apply business migrations to PROMPTS_DB. No extra secrets or REST/S3 credentials required. Configure the bindings on the production Worker (and each Wrangler environment separately if used). Verify generated .output/server/wrangler.json after pnpm cf:build. Re-deploy via existing pnpm cf:deploy workflow.

## Local and production verification

Plain pnpm dev does not have these native bindings. The gallery intentionally returns a visible retryable 503 rather than displaying misleading empty data. To test real data use an explicitly configured Cloudflare preview: pnpm cf:build then pnpm exec wrangler dev --remote (use the generated configuration as required by the project's Nitro build). Use an isolated preview environment for existing business bindings; the gallery only reads source resources. Alternatively configure local simulated D1/R2 with the upstream migration and synthetic cleared records/objects, never run migrations against production from this consumer.

Run `pnpm exec tsx --test src/modules/prompt-gallery/service.test.ts`, `pnpm build` and `pnpm exec tsc --noEmit` (after route generation).

On a configured preview or production host:
- GET /api/prompt-gallery/list?offset=0: 200 with up to 24 cards, nextOffset, no full prompt or raw R2 keys.
- GET /api/prompt-gallery/prompt?id=<cleared image ID>: full original prompt; pending/unknown IDs return 404.
- GET a returned imageUrl: 200 with image content type and ETag. For original append &variant=original.
- Check that a known pending ID and arbitrary index yield 404 even with If-None-Match. A removed/withdrawn case must no longer return content. All public responses are no-store; no permanent CDN caching.
- Check desktop/mobile waterfall, automatic pagination, copy success, manual copy fallback, empty/error states.
- A synced catalog may have few or zero cleared records. Never relax the clearance condition to populate the page.

List pagination uses stable featured-first/rank/ID ordering, offsets, and client ID deduplication. A source sync during browsing may shift offsets; a fresh visit reads current data. Images are served through same-origin per-case/index lookup; original third-party URLs are never image fallbacks. Attribution and license details appear on hover/focus and touch devices.
