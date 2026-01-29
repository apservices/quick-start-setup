
Context recap (what’s happening)
- Your publish/build is failing right now for a non-code reason: the project is missing the required npm script `build:dev` (and also needs a root `index.html` for Lovable’s build runner). Until those are added, “Publishing failed” will keep happening regardless of pipeline/auth fixes.
- In the app itself, there’s a large split-brain situation:
  - Some pages use Supabase tables (e.g., `app/dashboard/models/page.tsx`).
  - Many critical pipeline screens still use the in-memory `lib/data-store.ts` (for “forges”, capture assets, audit logs, etc.), which is the opposite of “Supabase as workflow engine”.

Non‑negotiable security constraint (must override the earlier request)
- We cannot use `profiles.role` as the authorization source of truth. Roles must come from a dedicated roles table (your selection: `public.user_roles`).
- We can still keep `profiles` for “identity/profile” data (full_name, city, etc.), but authorization must be derived from `user_roles`.

Phase 0 — Unblock publishing (you will do this now)
1) Add script in `package.json`:
   - Add:
     - `"build:dev": "vite build --mode development"`
   - Keep the existing scripts.

2) Create a root `index.html` at project root (same level as package.json)
   - Minimal placeholder is fine (Lovable needs it to initialize builds).

3) Retry Publish
   - If it still fails, we’ll read build logs/console logs and address the next blocker.

Phase 1 — AUTH & PROFILE: make Supabase explicit and deterministic
Goal
- After every login/session restore: verify user via `supabase.auth.getUser()`, ensure profile row exists (no triggers assumed), then load roles from `user_roles`, store both in app state, and only then render protected routes.

Current state (what exists)
- `lib/profile-provisioning.ts` already:
  - calls `supabase.auth.getUser()`
  - reads profile with `.single()`
  - inserts profile if missing
  - re-fetches profile
- `lib/auth-context.tsx` already defers provisioning in `onAuthStateChange` using `setTimeout(0)` (good, avoids deadlocks).

What we will change
A) Split “profile” and “role” in state:
- Keep the “ensure profile exists” behavior, but treat profile.role as non-authoritative (can even stop selecting it).
- Add a “load roles” step from `public.user_roles` and map to app role with deterministic precedence:
  - admin > model > client > viewer

B) Update AuthContext to store:
- session (already)
- user profile fields (id, email, name/full_name)
- computed role (from user_roles only)

C) Route guards:
- `app/dashboard/layout.tsx` already blocks on `isLoading`; we’ll ensure `isLoading` remains true until:
  - getUser() succeeded
  - profile ensured
  - role loaded
- Then `canAccessRoute` uses the computed role.

Supabase/RLS work needed (schema & policies)
- Confirm `public.user_roles` has RLS enabled; if enabled, currently it has no policies listed.
- Add policies so:
  - Admin can manage roles
  - Users can read only their own roles (or alternatively no direct read and use a SECURITY DEFINER RPC like `get_my_roles()`).
- Avoid recursion by using existing `public.has_role()` (already present in your DB functions list).

Phase 2 — MODEL PIPELINE: “model” users must have a `public.models` row (created by app)
Goal
- When a model user first enters the model portal: ensure `models.user_id = auth.uid()` exists; if not, create it from profile.

Current risk found in schema/policies
- `public.models.user_id` is nullable.
- RLS policies shown for `models`:
  - admin manages models
  - model reads own model (SELECT)
  - There is no INSERT policy for models to create their own row.
=> Result: the “ensure model row exists” flow cannot work until we add a safe INSERT policy (or route through an Edge Function).

What we will implement
A) A client helper/hook (e.g., `ensureModelRowForCurrentUser()`) called when model users enter the model portal:
- Query models by `user_id = auth.uid()` using `.maybeSingle()` to avoid hard failures when missing.
- If missing: insert `full_name`, `email`, `city` from `profiles` and set `status = 'pending'` and `user_id = auth.uid()`.

B) RLS changes needed on `models`:
- Add “model inserts own model row” policy:
  - WITH CHECK (user_id = auth.uid())
- Consider making `models.user_id` NOT NULL and UNIQUE (1 model record per auth user) to enforce the “models is the root” rule cleanly.
  - If we make it NOT NULL, we must also migrate existing rows (set user_id or decide how to handle legacy/admin-created rows). This will be handled carefully and only after checking Live data if publishing.

C) Status evolution:
- Enforce that only admins can change `models.status` (pending/approved/certified).
- Because Postgres RLS can’t restrict updates by column, we’ll do one of:
  1) Create an admin-only RPC to update status, and do not grant UPDATE to models at all, OR
  2) Split mutable “model-editable” fields into a separate table (e.g., model_profiles) and keep `models.status` admin-only.
- We’ll choose (1) initially to keep changes minimal.

Phase 3 — CAPTURE: upload to Storage, insert into `public.captures`
Goal
- Replace the in-memory `dataStore.addCaptureAsset(...)` that currently stores base64 `fileUrl` with:
  1) Convert capture frame to Blob
  2) Upload to Supabase Storage bucket `captures`
  3) Store URL/path in `captures.asset_url`, status='pending', and correct `model_id`

Code areas to change
- `components/capture/guided-capture-interface.tsx`
  - Replace base64 persistence with upload logic
  - After upload, insert into `public.captures`
- Any other capture components that use `dataStore` for capture assets.

Storage rules
- We will not store images in the database (no base64 in tables).
- We’ll store only the storage URL/path in `captures.asset_url`.

RLS dependencies
- `captures` INSERT policy requires the `model_id` to be a model row linked to auth user:
  - Therefore Phase 2 must be in place (ensure model row exists) before capture inserts will work reliably.

Phase 4 — PREVIEW: admin reviews pending captures → insert previews → update capture status
Goal
- Build/adjust an Admin Review screen that:
  - Lists `captures` where status='pending'
  - For each capture: create a `previews` row (capture_id, preview_url, approved)
  - If approved: update capture status -> 'approved'

Code areas likely to update
- `app/dashboard/validation/page.tsx` or `app/dashboard/audit/page.tsx` (depending on where review should live)
- Any existing “capture viewer” pages currently reading from `dataStore` (e.g., `app/dashboard/capture-viewer/page.tsx`).

DB/RLS considerations
- `previews` is admin-managed already per policies.
- `captures` updates currently only admin manages (per policies), which matches the requirement.

Phase 5 — Remove/retire the in-memory DataStore for pipeline-critical paths
Goal
- Stop using `lib/data-store.ts` for operational pipeline state.
- Keep it only if needed for demo-only UI, but not for any route used in production workflows.

Approach
- Identify all routes/components importing `dataStore` (we found many matches).
- For each, decide:
  - Replace with Supabase queries + subscriptions (where applicable), or
  - Remove features that are purely demo artifacts if they conflict with the real pipeline.

Phased migration agreement (your selection)
- We will migrate in this order:
  1) Auth + roles from `user_roles`
  2) Ensure models row exists for model users
  3) Capture upload to Storage + captures insert
  4) Admin review -> previews + capture status updates
  5) Then expand to Jobs/Applications, Licenses/Contracts/Financeiro

What I need from you (sequencing)
1) You add `build:dev` + root `index.html` now, then retry Publish.
2) If Publish still fails, share the new build log snippet (the first error line is enough).
3) Then I’ll implement Phase 1–2 changes first (auth roles + ensure model row), because Captures depends on Models.

Technical notes (for reviewers)
- Use `.maybeSingle()` for existence checks (models row), but `.single()` is fine for required reads after insert.
- Avoid Supabase calls inside `onAuthStateChange` callback; keep `setTimeout(0)` pattern already present.
- Ensure `user_roles` policies do not cause recursion; use existing security definer helpers where needed.
