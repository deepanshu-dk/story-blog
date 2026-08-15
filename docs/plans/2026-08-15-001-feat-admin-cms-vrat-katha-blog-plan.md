---
title: Admin-Managed CMS for the Hindi Vrat Katha Blog
type: feat
status: completed
date: 2026-08-15
origin: docs/brainstorms/2026-08-15-001-admin-cms-requirements.md
deepened: 2026-08-15
---

# Admin-Managed CMS for the Hindi Vrat Katha Blog

## Summary

Build the site as a greenfield Next.js (App Router) application backed by MongoDB Atlas, with a single-admin content panel (env-var credentials, signed session cookie) that creates/edits Vrat Katha stories and toggles them Active, a Cloudinary-backed image pipeline with a mandatory alt-text gate on publish, and tag-based on-demand revalidation so the public site (homepage, category pages, story pages, sitemap) reflects every publish/edit within seconds — no static rebuild required.

---

## Problem Frame

The original project brief called for a static, git-committed Phase 1 with the database deferred. The brainstorm (see origin) established that the actual desired workflow is CMS-style from day one: the admin writes a story once in a dashboard, flips it Active, and it's live — no code edits, no redeploys. This plan designs that system directly, on an empty repository with no existing patterns to reconcile against.

---

## Requirements

- R1. Single admin account, no signup flow, no multi-admin/roles.
- R2. Admin credentials as environment variables; password never stored or compared in plaintext in the session layer.
- R3. Admin routes redirect unauthenticated visitors to login.
- R4. Login session persists across page loads until logout or expiry.
- R5. Story fields: title, slug, intro, content sections, featured image, inline images+alt, category, tags, related stories, SEO fields (title, meta description, canonical, OG title/description/image).
- R6. Unique slugs; duplicate save attempts are rejected.
- R7. Admin can edit any field of an existing story, including images.
- R8. Admin can permanently delete a story with confirmation.
- R9. Story list is searchable, filterable (category, active state), sortable (date, views).
- R10. Active/Inactive flag per story, defaulting to Inactive.
- R11. Only Active stories are servable; others return a not-found-class response.
- R12. Create/edit/Active-state changes reflect on the public page(s) within seconds, no redeploy.
- R13. Category and homepage listings reflect changes within the same window.
- R14. Images stored in Cloudinary, not the app server's filesystem.
- R15. Every image requires alt text before a story can go Active.
- R16. Admin can create/rename/delete categories; each story has exactly one primary category.
- R17. Reader search runs against the database (MongoDB text search).
- R18. Each story page shows related stories pulled dynamically from the database.
- R19. Story page includes a free-text "what should we write next" form.
- R20. Submitted requests are persisted (text + timestamp), no reader identity required.
- R21. Admin has a request inbox, newest first, markable as reviewed.
- R22. Each published story view increments a stored counter.
- R23. Admin dashboard shows story totals, active/inactive counts, and most-viewed; deeper analytics stay in GA/Search Console.

**Origin actors:** A1 (Admin — content owner), A2 (Reader — site visitor)
**Origin flows:** F1 (create & publish a story), F2 (edit or unpublish a story), F3 (reader discovers & reads), F4 (reader submits a story request)
**Origin acceptance examples:** AE1 (covers R10, R11 — Inactive story 404s), AE2 (covers R10, R12 — Active toggle goes live in seconds), AE3 (covers R12, R13 — edits ripple to listings), AE4 (covers R15 — missing alt blocks publish), AE5 (covers R6 — duplicate slug rejected), AE6 (covers R19-R21 — request appears in inbox)

---

## Scope Boundaries

- Scheduled/future-dated publishing — manual toggle only.
- Multi-admin accounts, roles, permissions.
- Draft autosave, version history, revision rollback.
- AdSense placement/configuration through the admin panel.
- Elasticsearch or any third-party search service.
- Reader accounts, comments, likes, or reader-identity features.
- Broader traffic analytics (sources, device, geography) beyond the story-level counts derivable from the database.

### Deferred to Follow-Up Work

- Redirect-table support for changed slugs on already-Active stories: this plan makes slugs immutable once Active instead (see Key Technical Decisions); a proper old→new redirect record is a natural follow-up if the immutability constraint proves too rigid in practice.
- Automated cleanup of orphaned Cloudinary assets from abandoned uploads: accepted as manual/periodic housekeeping for now.

---

## Context & Research

### Relevant Code and Patterns

None — repository is an empty git init with no prior code, dependencies, or conventions to follow.

### Institutional Learnings

None found — no `docs/solutions/` history exists yet for this repository.

### External References

- Next.js `revalidateTag` / `revalidatePath` APIs and tag-based cache invalidation guidance — https://nextjs.org/docs/app/api-reference/functions/revalidateTag, https://nextjs.org/docs/app/guides/how-revalidation-works
- Cached Mongoose connection pattern for serverless (still current) — https://github.com/vercel/community/discussions/424
- Cloudinary signed uploads with Next.js (`next-cloudinary` `CldUploadWidget` + signature endpoint) — https://cloudinary.com/blog/guest_post/signed-uploads-in-cloudinary-with-next-js, https://next.cloudinary.dev/clduploadwidget/signed-uploads
- MongoDB text index limits (one text index per collection, compound/weighted fields) and Atlas Search as the future upgrade path if outgrown — https://www.mongodb.com/docs/manual/reference/limits/
- Next.js Server Actions' built-in Origin/Host CSRF check — https://nextjs.org/docs/app/guides/server-actions
- Vercel request body size ceiling (4.5MB Hobby / 6MB Pro) — motivates the signed direct-upload choice over proxying image bytes through a Route Handler — https://saurav.digital/blog/nextjs-file-upload-size-limit
- **Version caveat:** research surfaced Next.js 16.x with a `middleware.ts` → `proxy.ts` rename from a single blog aggregator, not verified against `nextjs.org/blog` directly. Verify the actual installed version and correct middleware filename against `package.json` once the project is scaffolded (Implementation Unit U1).

---

## Key Technical Decisions

- **Database and admin panel built now, not deferred** (see origin: docs/brainstorms/2026-08-15-001-admin-cms-requirements.md) — the core ask is inherently a persistence problem.
- **Mongoose schema shape:** content sections as an array of a discriminated subdocument (`type: 'text'|'image'`, per-type validation, e.g., image sections require `alt`) — scoped to exactly the two section types the origin document's content structure actually names (intro/story text and images); no speculative `quote`/`embed` variants without a current consumer; category as an `ObjectId` reference (curated, renameable taxonomy); tags as a plain `[String]` array (free-text, no referential integrity needed at this scale); related posts as `ObjectId` references populated at read time, never denormalized at write time; SEO fields nested under a `seo` subdocument; `isActive: Boolean` (not an enum — scheduled publishing is explicitly out of scope, so no draft/scheduled state machine is needed yet); `viewCount` incremented via atomic `$inc`, never read-modify-write.
- **Slug handling:** unique index is the source of truth (not check-then-insert, which races); catch the `E11000` duplicate-key error and surface it as the "slug taken" validation message. Slug becomes **immutable once a story is Active** — editing content/SEO/images stays open, but changing the slug requires deactivating first. This sidesteps building a redirect-table feature that wasn't scoped (see Scope Boundaries).
- **Auth:** a full auth library (Auth.js/NextAuth) is overkill for one hardcoded admin. Use a signed/sealed session cookie (`iron-session`) set by a Server Action that checks `username`/`password` against env vars using a timing-safe comparison (`crypto.timingSafeEqual`) for both fields, and returns a generic "invalid credentials" error regardless of which field was wrong (no username-enumeration signal, since there's only one valid username). Route protection lives in edge middleware matching `/admin/:path*`, verifying **both the cookie's signature and its embedded expiry claim** (not signature alone — a correctly-signed but expired seal must still be rejected at the edge without waiting for a Node-side check). Cookie flags: `httpOnly`, `secure`, `sameSite: 'lax'` (paired with Server Actions' built-in Origin/Host check as the CSRF backstop for admin mutations). A session-secret version is embedded in the signed payload so rotating the admin password invalidates all existing sessions immediately. This version is stored as a small single-document Mongo collection (not a plain environment variable), read live by the Node Server Action on login/verification — Vercel's environment variables are injected at build/deploy time, so a plain env var would likely require a redeploy to propagate a bump, defeating the "immediate" guarantee. The Edge middleware, which cannot call Mongoose, verifies the cookie's signature and expiry at the edge as already described; the DB-backed version check happens on the Node side (e.g., the next Server Action the session touches), so a full compromise-response still requires one authenticated round-trip, not a redeploy. Cookie theft via XSS/malware (full account takeover, no secondary device/IP signal) is accepted as a residual risk appropriate for a single-owner blog and is now listed explicitly in Risks & Dependencies rather than left implicit.
- **Login rate limiting:** Vercel's serverless functions don't share in-memory state, so a Mongo-backed attempt counter (per IP, exponential backoff/lockout) is used instead of an in-process counter — no Redis dependency added for this alone. The IP value must come from Vercel's platform-populated forwarded-IP source (not a raw client-supplied header read verbatim, which is attacker-controlled and would make every rate limiter in this plan trivially bypassable by rotating a header per request) — `src/lib/rateLimit.ts` centralizes this extraction so both the login and story-request limiters (U4, U10) use the same trusted path rather than each reimplementing it. IP-only keying can collateral-lock a shared NAT/office IP; this is an accepted tradeoff at single-admin scale, documented in Risks & Dependencies, with a manual-unlock path (direct deletion of the rate-limit record) documented in Documentation / Operational Notes in case the admin locks themselves out.
- **Images:** signed direct-to-Cloudinary browser upload (`next-cloudinary`'s `CldUploadWidget` with a `signatureEndpoint`) rather than proxying file bytes through a Route Handler — avoids Vercel's Hobby-plan 4.5MB request body ceiling and Route Handler memory buffering. The signature-generation Route Handler is the only server-side Cloudinary touchpoint (uses the API secret, never exposed to the browser), and each signature is scoped to specific upload parameters (not a blanket signature) with Cloudinary's short default timestamp validity window, so a logged/intercepted signature response can't be replayed outside its intended upload. Alt-text-required is enforced at two layers: Mongoose schema validation on the image subdocument, and a server-side guard that blocks the Active-toggle transition **and re-runs on every subsequent save of an already-Active story** if any image section lacks `alt` (Cloudinary itself has no such concept) — this closes the gap where an admin could edit a live story after publish and blank out an image's alt text without re-triggering the guard.
- **Revalidation:** tag-based (`revalidateTag`), not path-based. `revalidateTag` only invalidates entries in Next.js's Data Cache, which is populated by `fetch()` calls or by functions wrapped in `unstable_cache(fn, keyParts, { tags })` — since this plan's data layer is Mongoose (not `fetch()`), every public-facing read (homepage, category page, story page, sitemap, search) must explicitly wrap its Mongoose query in `unstable_cache` using the tag names defined in `src/lib/cacheTags.ts`, or the tag machinery has nothing to invalidate and pages either stay fully dynamic (correct but no caching benefit) or, worse, a route like the sitemap's GET handler gets cached once with no path back to freshness. This wrapping is stated explicitly here and in U7/U8/U9/U12's Approach so it isn't left for an implementer to discover. On create/edit/publish/delete, the relevant tags are revalidated together so homepage, category pages, the story's own page, and the sitemap all refresh from one call site. A `revalidateTag` call that throws after a successful DB write must be logged/surfaced (not silently swallowed) — see U7 and the corresponding Risks & Dependencies row, since there's no monitoring/alerting elsewhere in this plan to otherwise catch a page silently serving stale content.
- **Deactivated/deleted story response:** HTTP 410 (Gone), not 404 — signals intentional removal to search engines for a URL that was previously indexed, rather than an ambiguous "never existed."
- **Category deletion:** reassigns affected stories to a seeded, non-deletable "Uncategorized" category rather than blocking the deletion or orphaning stories. The reassignment `updateMany` must complete and its matched/modified count be verified **before** the category document is deleted (not run concurrently or after) — Mongoose has no cross-collection foreign-key constraint to catch a reversed ordering, so this sequencing is stated explicitly in U6 rather than left implicit.
- **View counting:** atomic `$inc` on public (non-admin-session) page renders only. No search-engine-bot filtering in v1 — accepted as a source of mild inflation in the "most viewed" stat rather than added complexity.
- **Search:** a single compound `$text` index across `title`, `tags`, and a denormalized `categoryName` string field mirrored onto each story at write time (MongoDB allows only one text index per collection and can't span a joined collection in that index) — the `categoryName` mirror is re-synced via a single `updateMany({ category: id }, { categoryName: newName })` call whenever a category is renamed (atomic per matched document, though a mid-batch crash across many posts is still possible at scale — see Risks & Dependencies). Because this is a 100%-Devanagari content site and MongoDB's `$text` operator applies English-style stemming/stop-words by default (Hindi is not among its supported stemmer languages), the index is created with `default_language: 'none'` to fall back to simple tokenization instead of misapplying English-language rules to Devanagari text (U2). Upgrade path if outgrown — or if `'none'`-mode tokenization proves too naive once real content is indexed — is MongoDB Atlas Search (which has materially better multilingual support), not additional text indexes.
- **Story request abuse mitigation:** a hidden honeypot field plus the same Mongo-backed per-IP rate limiter used for login, since the endpoint is public, unauthenticated, and DB-writing. The `message` field carries an explicit max-length validation at the Mongoose schema layer (U2) so an unauthenticated, DB-writing endpoint can't be used for storage-exhaustion via oversized payloads even under IP rate limiting.
- **Concurrent edits:** last-write-wins is the accepted behavior — no optimistic concurrency or locking, consistent with draft-versioning being out of scope.
- **Upload ordering:** image upload to Cloudinary completes (client-side, via the signed widget) before the story document is saved with the resulting URL; an abandoned upload before save can leave an orphaned Cloudinary asset, accepted as a manual-cleanup cost (see Scope Boundaries).

---

## Open Questions

### Resolved During Planning

- Slug-change-on-live-story handling: resolved as immutable-once-Active (see Key Technical Decisions), not a redirect table.
- Sitemap/deactivation SEO handling: resolved as dynamic sitemap generation from Active stories only, tied to the same `'posts'` revalidation tag, plus 410 responses for deactivated URLs.
- Category-deletion cascade: resolved as reassignment to a seeded "Uncategorized" category.
- View-count semantics: resolved as admin-view-excluded, bot-filtering deferred.
- Image upload failure ordering: resolved as upload-then-save, orphaned assets accepted.
- Concurrent edit race: resolved as last-write-wins, explicitly accepted.
- Story request spam vector: resolved as honeypot + IP rate limit.
- `revalidateTag` cache participation: resolved as wrapping every public Mongoose read in `unstable_cache` with the shared tag set (Key Technical Decisions, U7/U8/U9/U12) — `revalidateTag` alone has nothing to invalidate against a plain Mongoose read.
- Cloudinary signature-endpoint access control: resolved as an explicit session check inside the Route Handler itself (U3), since the route falls outside the `/admin/:path*` middleware matcher.
- Session-secret-version storage: resolved as a DB-backed `SessionConfig` document (U2, U4) rather than a plain environment variable, since Vercel env-var changes are injected at build/deploy time and would likely require a redeploy to take effect.
- Devanagari search behavior: resolved as `default_language: 'none'` on the compound text index (U2), avoiding MongoDB's default English stemming/stop-words on non-English content.
- Content-section types: trimmed to `text`/`image` only, matching the origin's actual content structure — `quote`/`embed` variants were speculative additions with no current consumer.

### Deferred to Implementation

- Exact installed Next.js version and the correct middleware/proxy filename for that version (verify against `package.json` in U1 rather than trusting the research pass's single-source claim of a 16.x rename).
- Exact npm package choices within the decided approach (e.g., `iron-session` vs. a `jose`-based hand-rolled seal) — an implementation-time library pick, not a product decision.
- Precise MongoDB indexes/compound key list for the login and story-request rate limiters (e.g., IP + time-window bucketing shape).

---

## Output Structure

    src/
      app/
        (public)/
          page.tsx                      # homepage
          [slug]/page.tsx                # story page
          category/[slug]/page.tsx       # category listing
          search/page.tsx                # search results
          sitemap.xml/route.ts           # dynamic sitemap
          robots.txt/route.ts
        admin/
          login/page.tsx
          page.tsx                       # dashboard
          stories/page.tsx                # story list
          stories/new/page.tsx
          stories/[id]/edit/page.tsx
          categories/page.tsx
          requests/page.tsx
        api/
          cloudinary/sign/route.ts        # signature endpoint only
      actions/
        auth.ts                          # login/logout Server Actions
        stories.ts                        # create/update/delete/publish Server Actions
        categories.ts
        requests.ts
      lib/
        db.ts                             # cached Mongoose connection
        session.ts                        # iron-session config, session verification
        rateLimit.ts                      # Mongo-backed attempt counter
      models/
        Post.ts
        Category.ts
        StoryRequest.ts
        SessionConfig.ts                  # single-document session-secret version
      middleware.ts                       # /admin route protection (filename per U1 verification)

---

## Implementation Units

### U1. Project scaffold and environment config

**Goal:** Stand up the Next.js App Router project with TypeScript, Tailwind, and the environment variables this plan depends on, and confirm the exact framework version before later units assume specific APIs.

**Requirements:** Foundational — enables R1-R23

**Dependencies:** None

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.env.example`, `.gitignore`

**Approach:**
- Scaffold via the current Next.js CLI (App Router, TypeScript, Tailwind).
- Verify the installed Next.js version and whether route protection belongs in `middleware.ts` or a renamed `proxy.ts` (see External References version caveat) before U4 writes that file.
- `.env.example` documents (without real values): MongoDB connection string, Cloudinary cloud name/API key/API secret, admin username/password, `iron-session` seal password. The session-secret *version* itself lives in the database (see U2, U4), not in this file, so rotating it doesn't require a redeploy.

**Patterns to follow:** None — greenfield.

**Test scenarios:**
- Test expectation: none -- scaffolding and config only, no behavior to verify yet.

**Verification:**
- App builds and runs locally with a placeholder homepage; `.env.example` lists every environment variable later units require.

---

### U2. MongoDB connection and core schemas

**Goal:** Establish the cached serverless-safe MongoDB connection and the Post, Category, and StoryRequest Mongoose models per the decided schema shape.

**Requirements:** R5, R6, R10, R16, R20, R22

**Dependencies:** U1

**Files:**
- Create: `src/lib/db.ts`, `src/models/Post.ts`, `src/models/Category.ts`, `src/models/StoryRequest.ts`, `src/models/SessionConfig.ts`
- Test: `src/models/__tests__/post.test.ts`, `src/models/__tests__/category.test.ts`

**Approach:**
- `db.ts` caches the connection on `global`/`globalThis` and guards model registration (`mongoose.models.X || mongoose.model(...)`) so hot reload and warm serverless containers don't reconnect or re-register.
- `Post` schema: `slug` (unique, indexed), `title`, `intro`, `contentSections` (array of discriminated subdocuments per type), `featuredImage`/`inlineImages` (`{ url, alt: required }`), `category` (ref), `tags` ([String]), `categoryName` (denormalized string, kept in sync with `category`), `relatedPosts` ([ref]), `seo` (nested subdocument), `isActive` (Boolean, default false), `viewCount` (Number, default 0), timestamps.
- `Category` schema: `name`, `slug` (unique), a seeded non-deletable `Uncategorized` document created via a one-time seed step.
- `SessionConfig` schema: a single-document collection holding `sessionSecretVersion` (Number), bumped whenever the admin password is rotated — read live by Node-side session checks so invalidation doesn't depend on an env-var redeploy (see U4).
- `StoryRequest` schema: `message` (String, `maxlength` enforced at the schema layer to cap payload size on this public, unauthenticated, DB-writing endpoint), `createdAt`, `reviewed` (Boolean, default false).
- Compound `$text` index on `Post` across `title`, `tags`, `categoryName`, created with `default_language: 'none'` so Devanagari content isn't run through MongoDB's English stemmer/stop-word list.

**Patterns to follow:** Cached-connection pattern from external references (Vercel community discussion).

**Test scenarios:**
- Happy path: creating a Post with all required fields, including an image with `alt`, saves successfully.
- Edge case: creating a Post with a duplicate `slug` raises a `E11000`-class error that the model layer surfaces distinctly from other validation errors.
- Edge case: creating a Post with an image missing `alt` fails schema validation.
- Integration: connecting twice within the same warm process reuses the cached connection rather than opening a second one.

**Verification:**
- All three models can be created, read, and validated against the field/constraint list above in a local MongoDB Atlas (or local Mongo) instance.

---

### U3. Cloudinary signed upload pipeline

**Goal:** Let the admin upload images directly to Cloudinary from the browser, with the server only ever handling signature generation.

**Requirements:** R5, R14, R15

**Dependencies:** U1, U4 (the signature endpoint gates on the admin session U4 establishes)

**Files:**
- Create: `src/app/api/cloudinary/sign/route.ts`
- Test: `src/app/api/cloudinary/__tests__/sign.test.ts`

**Approach:**
- `/api/cloudinary/sign` sits outside the `/admin/:path*` middleware matcher (it's an API route, not an admin page), so it is **not** protected by U4's edge middleware. This route explicitly calls U4's session-verification helper (`src/lib/session.ts`) itself and returns 401 if the session is missing or invalid, before generating a signature — the middleware matcher does not cover it, so the check must be inline in this handler.
- The Route Handler generates a Cloudinary signature server-side using the API secret, scoped to specific upload parameters (not a blanket signature), and returns it for the client-side `CldUploadWidget` to complete the upload directly to Cloudinary.
- No image bytes ever pass through this Route Handler or through Vercel's function body-size limit.

**Patterns to follow:** `next-cloudinary` signed-upload pattern (External References).

**Test scenarios:**
- Happy path: an authenticated admin request returns a valid signature payload.
- Error path: an unauthenticated request to the signature endpoint is rejected (401-class), since only the admin should be able to mint upload signatures.

**Verification:**
- A manual upload through the widget, using a generated signature, lands the image in the configured Cloudinary account and returns a usable URL.

---

### U4. Admin authentication

**Goal:** Single-admin login, session issuance, session verification at the edge, and session invalidation on credential rotation.

**Requirements:** R1, R2, R3, R4

**Dependencies:** U1

**Files:**
- Create: `src/lib/session.ts`, `src/lib/rateLimit.ts`, `src/actions/auth.ts`, `src/app/admin/login/page.tsx`, `middleware.ts` (or `proxy.ts` per U1's version check)
- Test: `src/actions/__tests__/auth.test.ts`

**Approach:**
- `auth.ts` Server Action verifies submitted credentials against `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars, then sets a sealed session cookie (`iron-session`) whose payload embeds the current session-secret version read from a single-document Mongo collection (e.g., `SessionConfig`) at login time.
- Middleware matches `/admin/:path*` (excluding `/admin/login`), verifies the cookie's seal/signature **and its embedded expiry claim** (no DB call — Edge runtime), and redirects to `/admin/login` on failure. This edge check is necessarily a lag-tolerant first pass — it cannot see a version bump until the Node-side check below runs.
- Every subsequent Node-side admin Server Action (not just login) also compares the session's embedded version against the live `SessionConfig` document and rejects the request if they differ, so a version bump takes effect on the very next authenticated action, not just at the edge.
- Logout clears the cookie.
- Rate limiting: failed login attempts are tracked in a Mongo-backed collection keyed by IP, with exponential backoff after repeated failures.
- Credential comparison uses `crypto.timingSafeEqual` for both username and password; the failure response is identical regardless of which field was wrong.

**Execution note:** Implement new domain behavior test-first — this is the highest-risk unit in the plan (auth) and errors here compromise the entire admin surface.

**Patterns to follow:** `iron-session` App Router pattern; Next.js Server Actions' built-in CSRF protection (use a Server Action for the login mutation, not a plain API route).

**Test scenarios:**
- Happy path: correct credentials issue a valid session cookie and subsequent `/admin` requests pass through middleware.
- Edge case: a request to any `/admin/*` path without a session cookie redirects to `/admin/login`.
- Edge case: a tampered/invalid cookie signature is rejected the same as a missing cookie.
- Edge case: a correctly-signed but expired cookie is rejected at the edge, not just at a later Node-side check.
- Error path: incorrect credentials do not issue a session and increment the rate-limit counter for that IP; the error message is identical for "wrong username" and "wrong password".
- Error path: after N consecutive failures from one IP, further attempts are blocked until backoff expires.
- Integration: bumping the `SessionConfig` version document (simulating a password rotation) invalidates a previously-issued session cookie on its next Node-side check, with no redeploy required.

**Verification:**
- An admin can log in, reach every `/admin/*` route, and is redirected to login when the session is absent, expired, or invalid.

---

### U5. Story CRUD and publish workflow

**Goal:** The admin can create, edit, delete, and toggle Active on stories, with slug and alt-text guardrails enforced.

**Requirements:** R5, R6, R7, R8, R9, R10, R11, R15

**Dependencies:** U2, U3, U4

**Files:**
- Create: `src/actions/stories.ts`, `src/app/admin/stories/page.tsx`, `src/app/admin/stories/new/page.tsx`, `src/app/admin/stories/[id]/edit/page.tsx`
- Test: `src/actions/__tests__/stories.test.ts`

**Approach:**
- The create form auto-populates the slug field from the title (slugify), matching the origin flow's "slug (auto-suggested from title, editable)" description; the field remains editable up until first save, independent of the immutable-once-Active rule.
- The content-section editor presents sections as an ordered list with add/remove/reorder controls and a per-type input form (plain text area for `text` sections, image picker + required alt-text field for `image` sections); an admin navigating away with unsaved section edits is warned before losing them.
- The image upload widget shows an in-progress state, a failure state with a retry action, and a success state confirming the image (and its alt-text field) is attached — since uploads can fail on slow connections and the plan has no other recovery path for that.
- Delete uses an explicit confirmation dialog naming the story's title and requiring an affirmative click (not a bare browser `confirm()`), consistent with R8's "with confirmation" and the fact that deletes are permanent (no version history, per Scope Boundaries).
- The story list shows a distinct "no stories match" state when a search/filter combination returns zero results, separate from the true-empty-collection state U11 already defines for the dashboard, plus a loading indicator while a query is in flight.
- When the alt-text guard rejects a save, the error identifies which specific image/section is missing alt text, not a generic rejection.
- The admin panel targets desktop-primary usage (content authoring, not the mobile-first public reading experience); it should not break on a tablet but is not optimized for phone-sized editing in this scope.
- Create/update Server Actions validate all R5 fields, catch `E11000` on slug collision and surface it as a field-level error (AE5).
- The Active-toggle transition runs a server-side guard: reject the toggle if any image section lacks `alt`, or if the requested slug differs from the currently-stored slug while the story is already Active (slug is locked once Active — deactivate first to rename). This same alt-text guard re-runs on **every save** of a story that is currently Active, not just at the moment it's toggled on — otherwise an admin could edit a live story afterward and blank an image's alt text without re-triggering the check.
- Delete performs a hard delete; U7 modifies this action to also trigger revalidation of the story's path, its category, and the homepage/sitemap tags at the same time as the DB delete (the revalidation call itself is added when U7 lands, not present in this unit's first pass).
- List view supports search (by title, delegated to U9's text index), filter (category, active state), and sort (date, views).

**Patterns to follow:** Mongoose validation pattern from U2; signed-upload flow from U3.

**Test scenarios:**
- Happy path: creating a story with all fields and Active=false saves successfully and appears in the admin list as Inactive.
- Happy path: toggling an eligible story to Active succeeds.
- Edge case: attempting to save a second story with an existing slug is rejected (Covers AE5).
- Edge case: attempting to toggle Active when an image lacks `alt` is rejected (Covers AE4).
- Edge case: editing an already-Active story to blank out an image's `alt` text is rejected on save, not silently allowed.
- Edge case: attempting to change the slug of a currently-Active story is rejected with a message to deactivate first.
- Error path: deleting a non-existent story ID returns a clear not-found result rather than a silent no-op.
- Edge case: a search/filter combination matching zero stories shows the distinct "no matches" state, not the true-empty-collection state.
- Edge case: an alt-text-guard rejection identifies the specific offending image/section, not a generic error.
- Integration: deleting an Active story triggers the same revalidation path as deactivating it (Covers F2).

**Verification:**
- An admin can complete the full F1/F2 flows end to end against a local database: create, publish, edit, unpublish, delete.

---

### U6. Category management

**Goal:** Admin CRUD for categories, with the Uncategorized-reassignment safety net on delete.

**Requirements:** R16

**Dependencies:** U2, U4

**Files:**
- Create: `src/actions/categories.ts`, `src/app/admin/categories/page.tsx`
- Test: `src/actions/__tests__/categories.test.ts`

**Approach:**
- Rename updates the category document and re-syncs the denormalized `categoryName` field on every Post referencing it via a single `updateMany({ category: id }, { categoryName: newName })` call; U7 modifies this action to also revalidate the affected `category-{slug}` tags once it lands (not present in this unit's first pass). Because a mid-batch crash across many posts could still leave some documents with a stale `categoryName`, the action also exposes an idempotent repair check (comparable count of `Post`s where `categoryName !== category.name` for a given category) that can be re-run manually if drift is ever suspected.
- Delete **reassigns every Post referencing the deleted category to the seeded "Uncategorized" category first, verifies the reassignment's matched/modified count against the expected total, and only then deletes the Category document** — this ordering is explicit and never reversed, since Mongoose has no cross-collection constraint to prevent orphaned `Post.category` references if a future change ran the delete first. The "Uncategorized" category itself cannot be deleted (guarded in the action).

**Patterns to follow:** U2's Category schema and seeded-category convention.

**Test scenarios:**
- Happy path: creating and renaming a category succeeds, and posts referencing it show the new `categoryName` after rename.
- Edge case: deleting a category with assigned posts reassigns all of them to Uncategorized rather than leaving them orphaned.
- Edge case: attempting to delete the Uncategorized category itself is rejected.
- Edge case: the repair check correctly identifies posts whose `categoryName` doesn't match their referenced category's current `name`.
- Integration: the reassignment `updateMany`'s matched count is verified before the category delete proceeds — the delete does not run if reassignment didn't cover every referencing post.

**Verification:**
- Deleting a populated category leaves zero posts with a dangling category reference; all reassigned posts render correctly on their category-listing page (now Uncategorized's).

---

### U7. Tag-based revalidation wiring

**Goal:** Tie every content mutation (U5, U6) to the correct cache tags so public pages and the sitemap refresh within seconds, without per-route `revalidatePath` sprinkling.

**Requirements:** R12, R13

**Dependencies:** U5, U6

**Files:**
- Modify: `src/actions/stories.ts`, `src/actions/categories.ts`
- Create: `src/lib/cacheTags.ts` (tag-name helpers shared across fetches and revalidation calls)
- Test: `src/actions/__tests__/revalidation.test.ts`

**Approach:**
- All public-facing data reads (homepage, category page, story page, sitemap) are wrapped in `unstable_cache` with a shared `'posts'` tag plus specific `post-{slug}` / `category-{slug}` tags (defined in `cacheTags.ts` so producer and consumer sides can't drift) — this is the wrapper that lets a Mongoose-backed read participate in Next.js's Data Cache at all, since `revalidateTag` has nothing to act on for a plain DB call.
- Every story/category mutation calls `revalidateTag` for the shared tag plus the specific tag(s) it affects, in the same action that performs the write. If `revalidateTag` throws after the DB write already succeeded, the error is caught and logged (not swallowed) so the admin has some signal that a page may be serving stale content until the next revalidation — this plan has no monitoring/alerting elsewhere, so this log line is the only safety net for that failure mode.

**Technical design:** *(directional, not implementation specification)*
```
onStoryPublishOrEdit(post):
  write to DB
  revalidateTag('posts')
  revalidateTag(`post-${post.slug}`)
  revalidateTag(`category-${post.categoryName}`)
```

**Patterns to follow:** Next.js tag-based revalidation guidance (External References).

**Test scenarios:**
- Integration: an untouched (non-revalidated) cached page continues serving its cached read between edits, proving the `unstable_cache` layer is actually in effect and not silently bypassed by fully dynamic rendering.
- Integration: publishing a story revalidates its own page, its category page, and the homepage within the same request cycle (Covers AE2, AE3).
- Integration: renaming a category revalidates every affected story's category tag, not just the category page itself.
- Edge case: deleting a story revalidates the same tag set as deactivating it, so the sitemap and listings drop it (Covers F2's delete-vs-deactivate gap).
- Error path: a story is saved successfully to the DB but `revalidateTag` throws — the DB reflects the new state, the error is logged, and the write is not rolled back or silently retried indefinitely.

**Verification:**
- Manually toggling a story Active/Inactive and refreshing the homepage/category/sitemap shows the change without a redeploy, within a few seconds.

---

### U8. Public story pages, homepage, and category listings

**Goal:** Readers can browse and read Active stories at clean URLs; Inactive/deleted stories return 410.

**Requirements:** R11, R12, R13, R18, R22

**Dependencies:** U7

**Files:**
- Create: `src/app/(public)/page.tsx`, `src/app/(public)/[slug]/page.tsx`, `src/app/(public)/category/[slug]/page.tsx`
- Test: `src/app/(public)/__tests__/story-page.test.ts`

**Approach:**
- The `[slug]` route fetches the story via the `unstable_cache`-wrapped, tagged read from U7. Two distinct not-servable cases: a slug that matches a story with `isActive: false` (or a deleted story) returns HTTP 410 (Gone) per the deactivation SEO decision; a slug that never matched any story returns a standard 404. The two cases are deliberately distinguishable so monitoring can tell "removed on purpose" from "never existed."
- Related stories query by shared category/tags, dynamically, at render time.
- Each render of a public (non-admin-session) story page performs the atomic `viewCount` `$inc`. There is no admin-preview bypass of the Active check in this plan — an admin wanting to see a draft's rendered output previews it by temporarily toggling it Active (per R10-R11), not via a separate preview route, since no origin requirement calls for one.

**Patterns to follow:** U7's tagging convention for all fetches on these pages.

**Test scenarios:**
- Happy path: an Active story renders at its slug with title, sections, images, and related stories (Covers F3).
- Edge case: requesting an Inactive story's slug returns 410 even for an authenticated admin session — there is no admin-preview bypass of the Active check, so an admin can only see a story's live rendering by toggling it Active first (Covers AE1).
- Edge case: requesting a slug that was never created returns a plain 404, distinct from the 410-for-deactivated case.
- Integration: an authenticated admin session's own view of an Active story's public page does not increment `viewCount`, consistent with the public-render-only counting rule in Key Technical Decisions.

**Verification:**
- The full F3 flow works end to end: homepage → category → story → related stories, with Inactive stories unreachable everywhere.

---

### U9. Search

**Goal:** Readers can find stories by vrat/festival/story name using MongoDB text search.

**Requirements:** R17

**Dependencies:** U2, U7

**Files:**
- Create: `src/app/(public)/search/page.tsx`
- Test: `src/app/(public)/__tests__/search.test.ts`

**Approach:**
- The incoming search parameter is coerced to a `String` (non-string/object-shaped values are rejected rather than passed through) before it reaches the query, then run against the compound `$text` index defined in U2 (`title`, `tags`, `categoryName`), filtered to `isActive: true` only.

**Patterns to follow:** U2's text index.

**Test scenarios:**
- Happy path: searching an exact story title (in Devanagari) returns that story, confirming the `default_language: 'none'` index behaves correctly on non-English content.
- Edge case: searching a term matching only an Inactive story returns no results.
- Edge case: empty query returns an empty/prompt state rather than the entire collection.
- Error path: a non-string/object-shaped query parameter is rejected rather than passed into the `$text` query.

**Verification:**
- Search results only ever include Active stories, and match on title, tags, or category name.

---

### U10. Story request form

**Goal:** Readers can submit a free-text story request from any story page; the submission is spam-resistant.

**Requirements:** R19, R20

**Dependencies:** U2, U4 (reuses U4's rate-limit helper), U8

**Files:**
- Create: `src/actions/requests.ts`
- Modify: `src/app/(public)/[slug]/page.tsx` (embed the request-form component created by this unit into the page U8 created)
- Test: `src/actions/__tests__/requests.test.ts`

**Approach:**
- Server Action validates a hidden honeypot field is empty and applies the same Mongo-backed per-IP rate limiter pattern as U4's login guard before persisting the `StoryRequest`.

**Patterns to follow:** U4's rate-limit helper (`src/lib/rateLimit.ts`), reused rather than duplicated.

**Test scenarios:**
- Happy path: a normal submission with the honeypot empty is persisted (Covers F4, AE6).
- Error path: a submission with the honeypot filled is silently discarded (no error shown to the likely-bot submitter, no DB write).
- Edge case: repeated submissions from the same IP beyond the rate limit are rejected.
- Edge case: a submission exceeding the schema's `maxlength` on `message` is rejected rather than truncated or silently accepted.

**Verification:**
- A real reader can submit a request once without friction; scripted rapid-fire submissions are throttled.

---

### U11. Admin dashboard and request inbox

**Goal:** The admin's landing page after login shows story/request stats at a glance.

**Requirements:** R21, R23

**Dependencies:** U5, U10

**Files:**
- Create: `src/app/admin/page.tsx`, `src/app/admin/requests/page.tsx`
- Test: `src/app/admin/__tests__/dashboard.test.ts`

**Approach:**
- Dashboard aggregates: total stories, Active vs. Inactive counts, top-N by `viewCount`.
- Requests page lists `StoryRequest` documents newest-first with a "mark reviewed" action.

**Patterns to follow:** U2's models for aggregation queries.

**Test scenarios:**
- Happy path: dashboard totals match the actual counts in the database at time of render.
- Happy path: marking a request reviewed persists and is reflected on next load (Covers AE6).
- Edge case: an empty story collection renders zero-state counts rather than erroring.

**Verification:**
- Numbers on the dashboard match a manual count against the database for a small seeded dataset.

---

### U12. SEO plumbing: sitemap, metadata, robots

**Goal:** Only Active stories are discoverable to search engines, with correct per-story metadata.

**Requirements:** R5 (SEO fields), R11, R12, R13

**Dependencies:** U7, U8

**Files:**
- Create: `src/app/(public)/sitemap.xml/route.ts`, `src/app/(public)/robots.txt/route.ts`
- Modify: `src/app/(public)/[slug]/page.tsx` (Next.js Metadata API using each story's `seo` subdocument)
- Test: `src/app/(public)/__tests__/sitemap.test.ts`

**Approach:**
- Sitemap is generated dynamically from `isActive: true` stories only, tagged the same as the `'posts'` tag so it revalidates alongside content changes.
- Story page `generateMetadata` reads the `seo` subdocument for title/description/canonical/OG fields, falling back to `title`/`intro` when fields are unset.

**Patterns to follow:** U7's tagging convention.

**Test scenarios:**
- Happy path: sitemap.xml lists exactly the currently-Active stories' URLs.
- Edge case: deactivating a story removes it from the next sitemap fetch within the same revalidation window as its 410 response (Covers the sitemap/deactivation gap surfaced in flow analysis).
- Happy path: a story's `<title>` and OG tags reflect its `seo` subdocument when set, and sensible fallbacks when not.

**Verification:**
- Sitemap and metadata stay consistent with Active/Inactive state at all times, without a separate manual regeneration step.

---

## System-Wide Impact

- **Interaction graph:** Every content mutation (U5, U6) funnels through U7's tag-revalidation helper, which is the single point that keeps homepage, category pages, story pages, and the sitemap (U12) in sync — a bug there silently desyncs all four surfaces at once.
- **Error propagation:** Cloudinary upload failures (U3) surface at the widget/client layer before a story save is attempted; DB save failures after a successful upload leave the image orphaned in Cloudinary (accepted, see Scope Boundaries) but must not silently mark the story as saved.
- **State lifecycle risks:** last-write-wins on concurrent story edits (accepted); orphaned Cloudinary assets on abandoned uploads (accepted); rate-limiter collections (login, story requests) grow unboundedly unless given a TTL index — worth a TTL index on the rate-limit collection during U4/U10 implementation even though not called out as a separate unit.
- **API surface parity:** none — greenfield, single surface.
- **Integration coverage:** the publish→revalidate→public-visibility chain (U5→U7→U8/U12) and the category-delete→reassignment→re-sync chain (U6→U7) are the two cross-layer behaviors that unit tests alone won't prove; both have integration-scenario test cases called out in their respective units.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| MongoDB Atlas free-tier connection cap exhausted under serverless concurrency | Cached global connection (U2) + small `maxPoolSize`; monitor Atlas connection metrics after launch |
| Cloudinary free-tier credit ceiling (25/mo) exceeded as traffic grows | Rely on Cloudinary's automatic format/quality optimization to minimize bandwidth; revisit tier if usage approaches the cap |
| Single-admin credential compromise (no MFA) | Rate-limited login, short session lifetime, `httpOnly`/`secure` cookies, DB-backed session-version invalidation (not env-var-based, so no redeploy needed); accepted residual risk appropriate for a single-owner blog |
| Session-cookie theft via XSS/malware (full account takeover, no secondary IP/device signal) | Accepted residual risk at single-admin scale — no additional binding is planned; explicitly named here rather than left implicit |
| IP-only login/request rate limiting can collateral-lock a shared NAT or office IP | Accepted tradeoff at single-admin scale; manual-unlock path documented in Documentation / Operational Notes |
| Research's claimed Next.js 16.x / `proxy.ts` rename is single-source and unverified | U1 explicitly verifies the actual installed version and correct middleware filename before U4 depends on it |
| Vercel Hobby request body ceiling breaking image handling | Sidestepped entirely via signed direct-to-Cloudinary upload (U3), not a Route Handler proxy |
| Unbounded growth of rate-limiter tracking collections | Add a TTL index (noted under System-Wide Impact) during U4/U10 implementation |
| `categoryName` denormalization drifts if a rename's `updateMany` re-sync is interrupted mid-batch (serverless timeout, connection drop) | An idempotent repair check (U6) can detect and re-run the sync for any category where `Post.categoryName` no longer matches `Category.name` |
| A `revalidateTag` call throws after its DB write already succeeded, leaving public pages serving stale content with nothing to catch it (no monitoring/alerting is in scope) | The error is caught and logged at the call site (U7) as the only safety net; genuine alerting is out of scope for this plan |

---

## Documentation / Operational Notes

- `.env.example` (U1) is the single source of truth for required environment variables; document each one's purpose so future setup (or a teammate) doesn't have to reverse-engineer it from code.
- Before first deploy: create the MongoDB Atlas cluster, Cloudinary account, and set all env vars in Vercel's project settings — none of this plan's units provision those accounts themselves.
- No monitoring/alerting is in scope; Google Analytics/Search Console remain the traffic-observability tools per the origin document's scope boundaries.
- Self-lockout recovery: if the admin's own IP gets rate-limited out of `/admin/login`, document the manual recovery step (direct deletion of that IP's record in the rate-limit collection via a database console) somewhere accessible outside the admin panel itself, since the panel will be unreachable during a lockout.

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-08-15-001-admin-cms-requirements.md](../brainstorms/2026-08-15-001-admin-cms-requirements.md)
- Next.js revalidation: https://nextjs.org/docs/app/api-reference/functions/revalidateTag, https://nextjs.org/docs/app/guides/how-revalidation-works
- Cached Mongoose connection pattern: https://github.com/vercel/community/discussions/424
- Cloudinary signed uploads: https://cloudinary.com/blog/guest_post/signed-uploads-in-cloudinary-with-next-js, https://next.cloudinary.dev/clduploadwidget/signed-uploads
- MongoDB text index limits: https://www.mongodb.com/docs/manual/reference/limits/
- Next.js Server Actions CSRF behavior: https://nextjs.org/docs/app/guides/server-actions
- Vercel request body size limits: https://saurav.digital/blog/nextjs-file-upload-size-limit
