# GetAIPhotoEditor.com — MVP specification and implementation checklist

Status: implementation in progress · Updated: 2026-11-06

## Product

An English-first, SEO-led **AI photo editor**, built **on this TanStack Start / ShipAny repository** (not Next.js). Desktop home page: professional, light SaaS UI with a left-side image upload + prompt form and a large right-side preview/results workspace. Mobile: upload-first stacked layout.

### Phase 1 interface

- One input image; one natural-language prompt; click-to-fill prompt suggestions (remove object, change background, enhance photo, change style).
- No user-facing model picker or aspect ratio selector. A quality picker sets GPT Image 2.6 `quality` (`low`, `medium`, `high`, `xhigh`, `max`) and the credit price.
- Output keeps the source aspect ratio (`image_size` / `aspect_ratio`: `auto`), aimed at about 1024px. Quality changes detail and cost, not a separate resolution control.
- User can pick a local photo before logging in; authenticated upload/generation only.
- Preview original/results, download, edit again; meaningful pending/error states.
- A real AI feature is more important than SEO copy; page copy should not promise unsupported features.

## AI architecture

- Model: GPT Image 2.6. fal.ai uses `openai/gpt-image-2.6/flare/edit` (Flare is the speed/default variant). Replicate uses `openai/gpt-image-2.6-flare`, which edits through `input_images` and the same quality enum. The admin `photo_editor_provider` setting still chooses fal or replicate; neither path stays on Nano Banana 2.1.
- Provider choice is an explicit operator setting, not a blind automatic retry. Reuse `src/core/ai` provider adapters.
- The server decides model, provider and credits. Never accept provider/model/price from the browser.
- Retain template's `ai_task` + FIFO credits; make task submission idempotent; store provider task reference; poll for results and save them to storage.
- Never rerun a provider job solely because the browser poll or webhook timed out.
- Credits depend on quality (low 6, medium 10, high 13, xhigh 22, max 50). Medium is the default and matches the old 10-credit standard edit. The server looks the amount up from the validated quality. Charged at submission and revoked once if the job definitively fails.

## Payment

Waffo Pancake, **one-time credit packs only**, through the existing PaymentManager and atomic order/credit settlement. Reference: [CoderLim/genjutsu-ai](https://github.com/CoderLim/genjutsu-ai), especially `src/core/payment/waffo.ts` and `src/core/payment/waffo.test.ts`. **Do not overwrite this repository's newer atomic payment settlement logic**.

| Product ID   | Price (USD) | Credits | Medium-quality edits (10 credits) |
| ------------ | ----------: | ------: | --------------------------------: |
| starter_pack |        4.99 |     200 |                                20 |
| creator_pack |        9.99 |     500 |                                50 |
| pro_pack     |       19.99 |    1200 |                               120 |

- New verified accounts: tentative 20 welcome credits, with anti-abuse controls.
- Credits from purchased packs valid 365 days; prominently disclose expiry before payment.
- Create separate Waffo products and map local IDs to Waffo product IDs. Do not reuse Genjutsu's product mapping.
- Test/production credentials and webhooks must remain isolated.
- Reconcile by local order number; verify signed webhook and authoritative paid amount/currency before granting credits. Repeated webhook and success callback must grant only once.
- Waffo refund API was not present in the reference provider. Until implemented and tested, refund via Waffo dashboard + documented admin reconciliation; do not silently mark local refunds as complete.

## SEO / tools

One canonical tool landing page per distinct **user intent**, not a generated page for every synonym. Starter candidates: remove-object, change-background, enhance-photo. Tools share the editor, but each page has its own genuine examples, instruction defaults, description, and limitations. Add tool paths to sitemap. Do not claim features are tested until they are.

## Existing repository reuse

- TanStack Start/React 19, shadcn/ui/Tailwind v4, better-auth, Drizzle.
- `src/components/image-uploader.tsx`, `src/routes/api/storage/upload-image.ts`, `src/core/storage` / R2.
- `src/core/ai/{replicate,fal}.ts`, `src/modules/ai-tasks/service.ts`.
- `src/config/pricing.ts`, `src/modules/{credits,payment}/service.ts`, `src/routes/api/payment/*`.
- Existing route SEO, blog, sitemap, and i18n.

## Required acceptance checks

1. Anonymous visitor can inspect the editor and choose a photo locally; no server upload until authenticated.
2. Signed-in user can upload once and generate exactly one charged provider job per idempotency key; retries must not charge twice.
3. Provider status transitions and final images persist; failed jobs revoke credits once; the task owner is checked for every read.
4. Checkout for three products creates Waffo session with exact price; a real settled payment grants credits once; failed/unsigned/mismatched/test-mode callbacks never grant.
5. Waffo configuration is accessible from admin Settings, with secrets never exposed to client.
6. Generated output is retrievable/downloadable, My Creations shows user-specific jobs.
7. No dangling/demo SaaS feature claims, stale price tables, or unimplemented feature promises on public pages.
8. Build/typecheck, UI smoke test, test/prod Waffo sandbox and real low-value test before launch.

## Deployment prerequisites / caveats

- Configure real `VITE_APP_URL`, R2 storage, Replicate/Fal keys, Waffo merchant/store/production key and three real Waffo product IDs in admin.
- R2 upload code currently generates public URLs using configured `r2_domain`; do not treat private photo access as solved. Before public launch choose a controlled access policy and image expiration/deletion routine; do not index or surface user uploads.
- Domain registration and production merchant approval cannot be established by source code alone.
- Never reuse Genjutsu's Waffo secrets, checkout product IDs or arbitrary user data in this repository.
