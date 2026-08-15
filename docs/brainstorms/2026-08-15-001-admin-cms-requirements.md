---
date: 2026-08-15
topic: admin-cms-vrat-katha-blog
---

# Admin-Managed CMS for the Hindi Vrat Katha Blog

## Summary

Build the Hindi Vrat Katha blog as a database-backed site from the start: a single-admin content management panel where the owner creates, edits, and publishes/unpublishes Vrat Katha stories, which appear instantly on the public site at clean, extension-less URLs once marked active. This supersedes the originally-planned static/no-database Phase 1 — the database and admin panel are built now, not deferred.

---

## Problem Frame

The original project brief specified a two-phase rollout: Phase 1 as a static, git-committed content site with no database, and Phase 2 (database + admin panel) deferred until the idea was validated with real traffic. In practice, adding a new story under the static approach meant editing files directly in the repo and redeploying — workable for a developer, but it blocks the actual desired workflow: writing a story once, in one place, and having it show up live without touching code or Git. The owner wants to operate the blog like a normal CMS-backed site from day one, publishing stories in Hindi (Devanagari) for Indian women readers, without needing to redeploy for every new story or edit.

---

## Actors

- A1. Admin (site owner): Logs into a protected dashboard, creates/edits/deletes stories, manages categories, toggles publish state, uploads images, reviews reader story requests, and views basic per-post popularity stats.
- A2. Reader (site visitor): Browses the public site, reads published Vrat Katha stories at clean URLs, searches for stories, and optionally submits a request for the next story they'd like to see.

---

## Key Flows

- F1. Admin creates and publishes a story
  - **Trigger:** Admin wants to add a new Vrat Katha to the site
  - **Actors:** A1
  - **Steps:** Admin logs in with the single admin account → lands on dashboard → selects "New Story" → fills in title, slug (auto-suggested from title, editable), intro, content sections, category, tags, SEO fields, uploads featured/inline images (stored via Cloudinary) → saves as draft (inactive) or toggles Active immediately → on save, the corresponding public page is revalidated
  - **Outcome:** If Active, the story is live and reachable at its slug URL within seconds; if left inactive, it exists only in the admin panel and returns 404 on the public site
  - **Covered by:** R1-R9, R14-R16

- F2. Admin edits or unpublishes an existing story
  - **Trigger:** Admin needs to correct content, update SEO fields, or take a story down
  - **Actors:** A1
  - **Steps:** Admin opens the story from a list (searchable/filterable/sortable) → edits fields or flips Active off → saves
  - **Outcome:** Live page reflects the edit within seconds, or disappears from the public site (404) if deactivated — the story record itself is not deleted
  - **Covered by:** R7, R8, R14, R15

- F3. Reader discovers and reads a story
  - **Trigger:** Reader arrives via Google Search, homepage browsing, category page, or search
  - **Actors:** A2
  - **Steps:** Reader lands on homepage or category page → sees only Active stories → clicks a story card → reads at its clean URL (e.g. `/karwa-chauth-vrat-katha`) → sees related stories → optionally searches for another story by name
  - **Outcome:** Only Active stories are ever visible or reachable to readers; each page view increments that story's view counter
  - **Covered by:** R10-R13, R17, R18

- F4. Reader submits a story request
  - **Trigger:** Reader finishes a story and wants to suggest the next one
  - **Actors:** A2, A1
  - **Steps:** Reader fills a small form ("Which story would you like to read next?") on the story page → submits → request is saved → Admin later reviews the list of requests in the dashboard and can mark each as reviewed
  - **Outcome:** Request is persisted and visible to Admin; no reply is sent to the reader automatically
  - **Covered by:** R19-R21

---

## Requirements

**Admin authentication**
- R1. A single admin account exists; there is no signup flow and no multi-admin/role system in this scope.
- R2. Admin credentials (username and password) are stored as environment variables, not committed to Git or hardcoded in source, and the password is never compared or stored in plaintext in the session layer.
- R3. Admin routes/pages are protected — an unauthenticated visitor attempting to reach any admin URL is redirected to a login page.
- R4. A successful login establishes a session that persists across page loads until logout or expiry.

**Content management (CRUD)**
- R5. Admin can create a story with: title, slug, introduction, content sections (the multi-part structure from the original brief — intro, image, more story, image, full katha, related info), featured image, inline images with alt text, category, tags, related stories, and SEO fields (SEO title, meta description, canonical URL, OG title, OG description, OG image).
- R6. Slugs are unique; the admin panel prevents saving a duplicate slug.
- R7. Admin can edit any field of an existing story, including re-uploading or replacing images.
- R8. Admin can delete a story permanently, with a confirmation step.
- R9. Admin can search, filter (by category, by active/inactive), and sort (by date, by views) the story list.

**Publishing and live updates**
- R10. Each story has an Active/Inactive (published/unpublished) state, defaulting to Inactive on creation.
- R11. Only Active stories are servable on the public site; requesting an Inactive or non-existent story's URL returns a 404.
- R12. When a story is created, edited, or its Active state changes, the corresponding public page(s) reflect the change within seconds, without requiring a full site redeploy.
- R13. Category and homepage listing pages reflect newly-published or newly-unpublished stories within the same near-instant window.

**Images**
- R14. Images uploaded through the admin panel are stored in Cloudinary, not on the application server's filesystem.
- R15. Every image (featured or inline) requires alt text before the story can be marked Active — SEO/accessibility guardrail, not enforced for Inactive drafts.

**Categories**
- R16. Admin can create, rename, and delete categories; stories are assigned to exactly one primary category.

**Search**
- R17. Readers can search stories by title/vrat name/festival name; search runs against the database (MongoDB text search), not a static index or external search service.

**Discovery and related content**
- R18. Each published story page shows a set of related stories (by shared category/tags), pulled dynamically from the database.

**Story requests**
- R19. The story page includes a form where a reader can submit free-text describing the story they'd like to see next.
- R20. Submitted requests are persisted (reader's suggested topic, timestamp) — no reader identity/contact info is required or collected.
- R21. Admin has a dashboard view listing story requests, newest first, with the ability to mark each as reviewed.

**Admin dashboard / view counts**
- R22. Each published story's page view increments a stored counter.
- R23. The admin dashboard shows total stories, active vs. inactive counts, and a "most viewed" list; deeper traffic analytics (sources, devices, geography) remain the job of Google Analytics/Search Console, not this dashboard.

---

## Acceptance Examples

- AE1. **Covers R10, R11.** Given a story saved with Active = false, when a reader requests its slug URL directly, the site returns a 404 rather than the story content.
- AE2. **Covers R10, R12.** Given a story that is Inactive, when Admin toggles it to Active and saves, the story becomes reachable at its slug URL within seconds without a redeploy.
- AE3. **Covers R12, R13.** Given a published story, when Admin edits its title and category, the change is reflected both on the story's own page and on its (old and new) category listing pages within seconds.
- AE4. **Covers R15.** Given Admin uploads a featured image with no alt text, when Admin attempts to toggle the story to Active, the save is blocked until alt text is provided.
- AE5. **Covers R6.** Given an existing story with slug `karwa-chauth-vrat-katha`, when Admin tries to save a second story with the same slug, the admin panel rejects the save and prompts for a different slug.
- AE6. **Covers R19, R20, R21.** Given a reader submits a story request naming "Ahoi Ashtami", when Admin opens the dashboard's request list, the request appears with its submitted text and timestamp, unreviewed by default.

---

## Success Criteria

- The admin can go from writing a new Hindi Vrat Katha story to it being live and readable at a clean URL in under a few minutes, with zero code changes or redeployments.
- A reader can never reach a story the admin has marked inactive, directly or through navigation/search.
- `ce-plan` can design the database schema, admin UI, auth mechanism, and revalidation approach without needing to invent any additional product behavior, field, or workflow beyond what's listed above.

---

## Scope Boundaries

- Scheduled/future-dated publishing is deferred — only manual Active/Inactive toggle in this scope.
- Multi-admin accounts, roles, and permissions are deferred — single hardcoded admin only.
- Draft autosave, version history, and revision rollback are deferred.
- AdSense placement/configuration through the admin panel is deferred — ad slots remain code-level for now, per the original brief's AdSense architecture.
- Elasticsearch or any third-party search service is out of scope — MongoDB-native text search only.
- Broader analytics (traffic sources, device/geography breakdowns, funnel data) stay in Google Analytics/Search Console — the admin dashboard only shows counts derivable from the story collection itself (totals, active/inactive, most-viewed).
- Reader accounts, comments, likes, or any reader-identity feature are out of scope.

---

## Key Decisions

- **Database now, not deferred:** MongoDB (Atlas free tier) is introduced immediately rather than in a later phase, because the core ask — admin adds content, toggles active, it appears on the frontend — is inherently a persistence problem that static files can't satisfy well.
- **Cloudinary for images:** chosen over Vercel Blob or S3 for its free tier, built-in optimization, and low integration effort for a single-admin use case — see original Phase 1A architecture discussion.
- **Env-var single-admin auth, not a user table (for now):** matches the actual need (one owner, no team) while avoiding a plaintext password in source; a DB-backed hashed-password admin was considered and can be a low-effort upgrade later if needed.
- **On-demand revalidation over static rebuilds:** because content now lives in a database and the admin expects near-instant publish, statically-generated-at-build-time pages would require a redeploy per change — on-demand revalidation avoids that while keeping pages fast and cached between edits.
- **View counts stored in the app DB, not GA:** a simple denormalized counter per story is cheap to add now that a database exists, and answers "what's popular" faster than pulling it from Google Analytics each time.

---

## Dependencies / Assumptions

- Requires a MongoDB Atlas account (free tier) and a Cloudinary account (free tier) — both need to be created before implementation/deployment.
- Assumes Vercel Hobby plan supports the environment variables and serverless function usage this requires (session auth, on-demand revalidation, DB queries) — should hold at this scale, but plan should note this as an assumption to confirm during setup.
- Assumes the admin is a single person (the site owner) for the foreseeable future — if a second content contributor is ever needed, auth requirements (R1-R4) would need revisiting.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R2, R4][Technical] Which session/auth mechanism to use (e.g., NextAuth credentials provider vs. a custom signed-cookie session) — an implementation choice, not a product one.
- [Affects R14][Technical] Whether image uploads go through a Next.js API route to Cloudinary or use Cloudinary's direct unsigned/signed browser upload widget.
- [Affects R12, R13][Needs research] Exact on-demand revalidation mechanism and cache tags/paths needed so editing a story also refreshes category and homepage listings, not just the story's own page.
- [Affects R17][Technical] Whether MongoDB text search needs an explicit text index across which fields (title, tags, category) to keep queries fast as the story count grows.
