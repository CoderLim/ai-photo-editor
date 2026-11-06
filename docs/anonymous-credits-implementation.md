# Anonymous photo-edit trial — implementation and release checklist

> Implemented on branch `feat/anonymous-trial-signup-credits-20261106` (based on main). Not enabled or deployed to production by this PR.

## User experience

- A visitor can choose an image and edit prompt without signing in.
- The first **Generate Edit** creates a Better Auth anonymous session and attempts a **10-credit** grant on the server.
- Credit charges remain determined by the selected GPT Image 2.6 quality (Low 6, Medium 10, High 13, Extra High 22, Max 50).
- When guest balance cannot pay for the selected quality, the editor shows **Get 10 More Free Credits** with links to register or sign in.
- A newly registered account is granted **10 credits exactly once**. Signing in to an existing account does not repeat the signup grant.
- When a registered account lacks credits, the editor shows a **Get More Credits** dialog linking to the existing Waffo-backed pricing flow.
- Anonymous uploads and jobs retain the same per-owner signed upload token, idempotency key, provider job and credit refund protections.

## Database and auth

New fields on `user`: `is_anonymous` (non-null boolean, default false), `linked_user_id` (nullable). New tables: `free_credit_claim`, `guest_trial_ip_quota`. Changes cover SQLite/D1, PostgreSQL, and MySQL schema variants.

**Migrate before deploying code that uses the new user fields**, including when `ANONYMOUS_TRIAL_ENABLED=false`. The disabled flag gates anonymous *creation*, not the new Better Auth schema shape.

For the chosen DB provider, run the existing migration workflow:

```bash
pnpm db:generate
pnpm db:migrate
# or the project's approved schema-apply process (pnpm db:push)
```

Review generated SQL and back up production data before applying; do not blindly `db:push` to a live database. When the code and schema are deployed and the integration tests pass, set:

```env
ANONYMOUS_TRIAL_ENABLED=true
```

The default is `false` to guard against a partially deployed release. Keep `AUTH_SECRET` stable across releases; it is the key used to HMAC source public IPs.

## Free-credit anti-abuse

- Each guest can receive one grant, idempotently, protected by the primary key `guest:<userId>`.
- A trusted `CF-Connecting-IP` is HMAC-hashed and used for a persisted 2-claims-per-rolling-24h sliding window.
- An atomic DB write updates both IP timestamps, inserts the free-claim record and credits. Failed/overlimit writes roll back.
- In production, missing Cloudflare IP means no anonymous free grant. `X-Forwarded-For` is never trusted as an identity for trial claims.
- An application without a trusted Cloudflare ingress must implement an equivalent trusted source-IP mechanism before enabling the trial.
- The lightweight in-memory interval rate limit is only a secondary throttle. Configure Cloudflare WAF/rate-limiting for anonymous auth creation and free-claim endpoints, plus an abuse budget / alert on provider spend.
- IPs may be shared by homes, companies and mobile NAT; public IP alone is not a unique person identifier.

## Guest → account linking

The anonymous plugin is configured with `disableDeleteAnonymousUser: true`. The guest is marked with `linked_user_id` before history migration so pending submissions are rejected. Retaining the old user avoids deleting dependent rows via foreign-key cascade.

- **First** guest merge into a permanent account: migrate all guest credit ledger entries (including consumed source IDs) and AI tasks; preserve rollback and history semantics. New users also get the independent 10-credit signup grant.
- **Later** guest merges into the same permanent account: migrate creations only, **not** free credit balances/ledger. This prevents existing accounts signing out, exhausting new free guest grants, and importing more free credits repeatedly.
- For a later merge, an already submitted guest task's refund remains on the guest's original ledger, not the permanent account. This is deliberately documented rather than silently minting permanent-user credits.
- The link operation is guarded by the old guest's `linked_user_id` and the target's unique `merge:<userId>` claim. Merge is idempotent and late guest generations are blocked.
- Linked source users are currently retained for accounting and referential integrity; implement a separately audited retention/cleanup job before large-scale rollout. Avoid deleting a source while consumed credits or pending tasks still refer to it.

## Integration and smoke test checklist

- Run `pnpm build`, `pnpm exec tsc --noEmit`, `pnpm test:photo-edit`, `pnpm test:guest-credits`, plus existing payment tests.
- Browser: incognito new visitor → free Medium edit (cost 10) → next Generate prompts signup.
- Browser: new visitor with 10 remaining → signup without editing → balance 20; after one Medium edit → signup → balance 10.
- Google OAuth and email signup/link, returning sign-in and account creation; verify own history and credit eligibility on each.
- Browser: IP's first/second guest receives free grants; third new guest in a separate incognito session cannot claim.
- Existing registered user: no gift on repeat login; second guest merge must not increase user balance.
- Parallel tabs: claim/spend races cannot double-grant or overspend; failure refund remains idempotent.
- Payment: registered user with insufficient balance is routed to normal Waffo checkout and receives credits once on signed successful settlement.
- Private uploads: signed tokens must not authorize another user's edit; old guest upload tokens do not authorize new account.
- Verify externally configured R2, actual Fal/Replicate provider jobs, webhook callbacks and Cloudflare WAF before enabling in production.

## Caveats

- This implementation deliberately does **not** ship Turnstile or a daily hard-dollar provider budget. Add these at the Cloudflare edge or in a follow-up before broad public marketing.
- The legacy admin setting `initial_credits_*` is no longer used for new signups; this campaign grants a fixed ten credits. Do not assume toggling the legacy field changes this promotion.
- The provider image URLs are still governed by the existing storage privacy and retention requirements.
