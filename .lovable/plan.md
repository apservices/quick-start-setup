
Goal: Make the project build cleanly and replace all mock/localStorage data with Supabase (Auth + DB + Storage), while keeping the existing UI/layout unchanged and focusing on the blockers: Capture Viewer (real images), Preview flow (real records + storage URLs + realtime), and MVP licensing/contract wiring.

Context discovered (why the build is currently failing)
- The codebase is still using demo/localStorage stores (`lib/data-store.ts`, `lib/phase2-store.ts`, `lib/auth-context.tsx`, `lib/system-logger.ts`) even though you want Supabase as the single source of truth.
- Multiple TypeScript errors come from type drift:
  - `PlanType` is defined as `"BASIC" | "HYBRID" | "ENTERPRISE"` but the UI and demo data use `"PHYSICAL" | "DIGITAL" | "HYBRID"`.
  - `AuditAction` includes many values, but `ACTION_LABELS` in `app/dashboard/audit/page.tsx` is missing several keys, causing TS2740.
  - `SystemHealth` type is imported incorrectly, and the `services/metrics` object in `getSystemHealth()` doesn’t include required fields.
  - `tailwind.config.ts` has a Tailwind v4 type mismatch on `darkMode`.
- Supabase is not configured in the current Lovable environment (schema tool cannot fetch tables), so wiring will be done via standard `@supabase/supabase-js` + hosting env vars + your existing Supabase project.

Decisions confirmed via your answers
- Deployment target: Deploy externally (Next.js) (Vercel recommended).
- Supabase: Replace all mock stores (not just the two pages).
- Storage: Buckets are private → we must use Signed URLs (or authenticated access with proper Storage RLS) for image rendering.
- Tables that exist and are populated: `captures`, `previews`, `licenses`, `contracts`.

Deliverables (what “done” looks like)
1) Production build passes (TypeScript clean).
2) Capture Viewer renders real Supabase Storage images/videos (no placeholder.svg usage anywhere in that flow).
3) Preview flow:
   - Clicking “Generate Preview” creates a real record in `previews`.
   - `preview_url` comes from Supabase Storage (private bucket) and is rendered via a signed URL.
   - Gallery updates in realtime when previews are inserted/updated.
4) Licensing (MVP):
   - UI reads from `licenses` table.
   - Download is allowed only when there is a valid active license; otherwise blocked.
5) Contract (MVP):
   - A contract is auto-created when a license is created.
   - Simple action to mark contract as signed (roles: admin, brand/client).
   - Contracts link to `financeiro_transacoes` (via existing FK/column).
6) Model Technical Profile:
   - Shows requested fields + capture stats.
   - Editable by model in Model Portal, read-only in Brand Portal (same UI components, permission-gated).

Phase 0 — Unblock the build (no feature changes, only type correctness)
A. Fix PlanType mismatch (root cause of multiple TS errors)
- Update `PlanType` in `lib/types.ts` to match real domain usage: `"PHYSICAL" | "DIGITAL" | "HYBRID"` (or, if your DB uses different values, mirror the DB exactly).
- Update any plan-label maps in:
  - `app/dashboard/models/[id]/page.tsx`
  - `components/models/model-table.tsx`
  - `lib/certificate-registry.ts` stats comparisons
  - `lib/data-store.ts` demo init values (even though we’ll remove demo usage, it must compile).
- Ensure any indexing maps are typed as `Record<PlanType, string>` so TS7053 disappears.

B. Fix audit action label map completeness
- In `app/dashboard/audit/page.tsx`, change `ACTION_LABELS` typing to avoid “must contain every AuditAction” errors:
  Option 1 (preferred): `const ACTION_LABELS: Partial<Record<AuditAction, ...>> = { ... }` plus a safe fallback label/color when missing.
  Option 2: Add the missing keys listed by the compiler (and any others) so it’s a full `Record`.
- This removes TS2740 without changing UI behavior.

C. Fix `SystemHealth` export/import + required fields
- In `lib/system-logger.ts`:
  - Export the `SystemHealth` type (or import it directly from `lib/types.ts` in the component).
  - Make `services` include `vtg`.
  - Make `metrics` include `activePreviews` and `activeLicenses`.
- In `components/system-status.tsx`:
  - Strongly type the `statusIcon/statusColor` maps as `Record<SystemHealth["status"], React.ReactNode>` etc. to eliminate “unknown not assignable to ReactNode” and “indexing by any” errors.

D. Fix RBAC typing issue (TS2345 “never”)
- In `lib/rbac.ts`, ensure the permission map and `includes()` call are typed so that `allowedRoles.includes(role)` is valid (usually a narrow-typing issue caused by `as const` + array literals).
- Keep logic unchanged; only adjust types/casts to satisfy TS.

E. Fix Tailwind config typing
- In `tailwind.config.ts`, update `darkMode` to a valid Tailwind v4 type:
  - either `darkMode: "class"` or `darkMode: ["class", ".dark"]` depending on your setup.

F. Fix remaining TS errors in `lib/phase2-store.ts`
- Adjust the audit action being logged:
  - `"VTG_JOB_FAILED"` is currently not part of `AuditAction`. Either:
    - Add it to `AuditAction`, or
    - Log `"VTG_JOB_COMPLETED"` / `"SYSTEM_ERROR"` with metadata indicating failure.
- Fix `unknown` metadata typing where TS complains about passing `unknown` into `Record<string, unknown>`.

Phase 1 — Supabase foundation (replace mock auth + data access everywhere)
A. Add Supabase client integration (Next.js-friendly)
- Add dependency: `@supabase/supabase-js`.
- Create `lib/supabase/client.ts` that initializes Supabase using:
  - `process.env.NEXT_PUBLIC_SUPABASE_URL`
  - `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Hosting requirement (Vercel):
  - Add the above as environment variables in Vercel project settings.

B. Replace demo Auth with Supabase Auth (keep UI)
- Replace `lib/auth-context.tsx`:
  - Remove `DEMO_USERS` and localStorage session.
  - Use `supabase.auth.getSession()` + `supabase.auth.onAuthStateChange()` to keep `session` + `user`.
- Roles security requirement (no roles on users/profiles row):
  - Read roles from your existing `user_roles` table (or equivalent) after login.
  - Cache in state; do not store in localStorage.
  - `hasPermission/hasScope` should use the role(s) from `user_roles`.
- Keep existing UI flows (login page) but wire to Supabase sign-in.

C. Replace localStorage stores with Supabase repositories
- Deprecate `dataStore` and `phase2Store` usage in UI pages by introducing lightweight query functions (no UI redesign), e.g.:
  - `lib/repos/models.ts`
  - `lib/repos/forges.ts`
  - `lib/repos/captures.ts`
  - `lib/repos/previews.ts`
  - `lib/repos/licenses.ts`
  - `lib/repos/contracts.ts`
- Each repo does simple CRUD using `supabase.from("table")...` and returns typed results.

Phase 2 — PRIORITY 1 Blockers

1) Capture Viewer: render real uploaded images (private bucket, signed URLs)
Files involved:
- `app/dashboard/capture-viewer/page.tsx`
- `components/capture-viewer/capture-viewer-gallery.tsx`
- (plus new repo helpers)

Implementation approach:
- Replace `phase2Store.getCaptureAssets(digitalTwinId)` with a Supabase query:
  - Query `captures` table filtered by `digital_twin_id`.
  - Use the real storage path column (you mentioned `captures.asset_url` must always point to public URL, but you also said buckets are private—so we’ll store a storage path and generate signed URLs at runtime, or if your column already stores a public URL, we’ll render directly).
- Remove all placeholder logic:
  - Delete `resolveImageSrc()` and any fallback to `/placeholder.svg`.
  - If an asset has no URL/path, show it as “missing” in UI (no image) but do not inject placeholder.svg.
- Signed URL generation:
  - For each capture row: call `supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds)`.
  - Cache signed URLs in component state keyed by capture id/path to avoid refetch loops.
- Access control:
  - Admin: can see all relevant captures.
  - Model: can only see captures for their own model’s digital twin (enforced by RLS in Supabase; UI just uses current session).
- Video support:
  - If assets include videos, render a `<video>` tag in the dialog view when `type === VIDEO`.

2) Atlas Preview: real records + Storage URLs + realtime updates
Files involved:
- `components/visual-preview/preview-generator.tsx`
- `components/visual-preview/preview-gallery.tsx`
- `app/dashboard/visual-preview/page.tsx`

Implementation approach:
- Generator:
  - On click: insert into `previews` table:
    - `digital_twin_id`
    - `preview_type`
    - `created_by`
    - `status` (e.g., “QUEUED” or “PROCESSING”, matching your existing schema)
    - `expires_at` (7 days)
    - `preview_url` initially null unless you already have it at creation time
  - This satisfies “Create real records in previews” without faking an image.
- Gallery:
  - Query `previews` table for the digital twin and sort newest first.
  - For each row with storage path/url:
    - If private bucket: generate signed URL and render it (no `/placeholder.svg` fallback).
- Realtime:
  - Subscribe to Postgres changes on `previews` filtered by `digital_twin_id`:
    - on INSERT/UPDATE, refresh the list (or patch state).
  - This removes the current `refreshKey` hack and makes it realtime.

Phase 3 — PRIORITY 2 MVP business wiring

3) Licensing system (MVP)
Files involved:
- `app/dashboard/licenses/page.tsx` + existing license components
- `app/dashboard/assets/page.tsx`
- `components/assets/asset-gallery.tsx`

Implementation approach:
- Read licenses from `licenses` table by `model_id` (your requirement) and/or `digital_twin_id` (if that’s how your schema links; we’ll mirror existing columns).
- Ensure each license has:
  - `model_id`
  - `usage_type`
  - `valid_until`
- Enforce downloads:
  - In Asset Gallery, replace `hasActiveLicense` derived from `phase2Store` with a real “active license exists” check from Supabase:
    - active if `valid_until > now` and (optional) `status == ACTIVE` if your schema has it.
  - When downloading:
    - If bucket is private, generate a signed URL and trigger browser download.
    - Also create an audit/log record if you have an `asset_downloads` table already; otherwise skip creating new tables (per your rule).

4) Contract system (MVP)
Files involved:
- license creation UI: likely `components/licenses/license-creator.tsx` (to inspect during implementation)
- contract UI: wherever contracts are displayed (we’ll locate and wire existing pages)

Implementation approach:
- When a license is created (in the same client action):
  - Insert license row.
  - Immediately insert a contract row linked to the license (and/or model/brand depending on schema), with `signed = false`.
- “Mark contract as signed” action:
  - Update `contracts.signed = true` (plus `signed_at`, `signed_by` if those columns exist).
  - Role guard in UI:
    - Only admin and brand/client roles see the action.
  - Server-side enforcement must be via RLS (preferred) so clients can’t bypass it.
- Link contracts → `financeiro_transacoes`:
  - Use existing FK/column; if missing, we will pause and ask before adding any new column/table (per your “no new schema unless required” rule).

Phase 4 — PRIORITY 3 Model Technical Profile
Files involved:
- likely `components/career/*` and model detail pages

Implementation approach:
- Build a “technical sheet” view model from Supabase queries:
  - profile fields: `full_name`, `email`, `city` (only add column if truly missing; otherwise just read it)
  - capture stats:
    - total captures
    - valid captures
    - missing captures
- Model Portal:
  - fields editable by model (update profile row through Supabase).
- Brand Portal:
  - render the same data read-only.
- Keep existing UI; only swap data source and add minimal form wiring where editable.

Testing / acceptance checklist (end-to-end)
- Build passes: `next build` succeeds with zero TS errors.
- Auth:
  - Login/logout works with Supabase session persistence.
  - Roles are sourced from roles table, not localStorage.
- Capture Viewer:
  - Admin and model can view captures.
  - No `/placeholder.svg` used anywhere in capture rendering.
  - Images render via signed URLs (private bucket).
- Preview:
  - Clicking generate inserts into `previews`.
  - When `preview_url` becomes available, gallery updates automatically via realtime and renders the image (signed URL).
- Licensing:
  - Download is blocked with no active license.
  - Download works with active license and uses signed URL.
- Contract:
  - License creation auto-creates contract.
  - Admin/brand can mark signed; others cannot.

Risks / dependencies
- We need your exact Supabase bucket names and which columns store paths vs full URLs:
  - captures: do you store `asset_url` as a storage path (recommended for private buckets) or as a full URL?
  - previews: same for `preview_url`.
- RLS must allow:
  - authenticated users to create signed URLs / read storage objects as appropriate.
  - models to read only their own captures/previews.
  - brands/clients to read licensed assets only.
If any of those policies are missing, the UI will show “no data” or storage signed-url failures; we’ll adjust policies (without creating new architecture).

Implementation sequencing recommendation
1) Fix TS build errors (Phase 0) so you can deploy and iterate safely.
2) Add Supabase client + replace Auth (Phase 1) so every page can query with correct permissions.
3) Replace Capture Viewer data source + signed URL rendering (Phase 2.1).
4) Replace Preview flow + realtime (Phase 2.2).
5) Wire Licenses + enforce download gating (Phase 3.3).
6) Wire Contracts + signed action (Phase 3.4).
7) Add Technical Profile (Phase 4).

