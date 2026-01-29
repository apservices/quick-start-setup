
Objective
- Fix persistent login failures by guaranteeing a `public.profiles` row exists immediately after every successful Supabase login AND every session restore.
- Ensure the app does not assume any database trigger (e.g. `handle_new_user`) exists or runs.
- Unblock Lovable builds by adding the required `build:dev` script and a root `index.html` (you confirmed you’ll do these manually).

Important security note (must be explicit)
- Storing authorization roles in `profiles.role` can be made to work only if users can never update that field (no self-update policy, no client-side write path). Any future “profile update” feature that accidentally allows updating `role` becomes a privilege escalation risk.
- If you still want to proceed with `profiles.role` as the app’s role source of truth (you confirmed you do), we will keep `public.profiles` UPDATE locked down (no UPDATE policy for authenticated users), and we will not add any app code path that updates `profiles.role`.

Current state (what I found)
- `lib/auth-context.tsx` already has `ensureProfileExists()` using:
  - `select ... maybeSingle()` from `profiles`
  - `insert { id, role: "viewer", full_name }` if missing
  - re-fetch after insert
- Despite that, login is still failing per your report, and you’ve requested a very specific flow using `supabase.auth.getUser()` and `.single()`.

Why it’s likely still failing
- The most common causes in this situation:
  1) `supabase.auth.getUser()` is not being called, so the app may be provisioning using a session object that isn’t fully verified yet (rare, but possible in edge cases).
  2) The `profiles` read returns “no rows” and `.single()` throws, and the code path treats it as a fatal error instead of “profile missing”.
  3) RLS INSERT on `profiles` is still blocking profile creation for some users (policy mismatch or missing `to authenticated` scope).
  4) The UI renders protected routes before profile provisioning finishes (race), causing route guards to run with `user=null` or missing role.

Implementation plan (code + verification)

A) You (manual) — fix build blockers so Lovable can run builds
1) Add a `build:dev` script to `package.json`
- In `scripts`, add:
  - `"build:dev": "vite build --mode development"`
- This is required by Lovable’s build system even if your real app deploy uses Next.js.

2) Create a root `index.html`
- Create `index.html` at the repository root (same level as `package.json`).
- Minimal placeholder is fine; it only needs to exist for Lovable initialization.

B) App: implement your exact “getUser + single + insert + re-fetch” provisioning flow
Target file:
- `lib/auth-context.tsx`

What we will change
1) Centralize provisioning into a single function that uses getUser()
- Add a helper like `provisionProfileFromAuth()` that:
  - Calls: `const { data: { user }, error } = await supabase.auth.getUser()`
  - If `user` is null or error exists: treat as not authenticated (clear state).
  - Extract `user.id` and `user.email`.

2) Profile fetch using `.single()` with “not found” handling
- Implement:
  - `const { data: profile, error: profileError } = await supabase.from("profiles").select("id, role, full_name").eq("id", user.id).single()`
- If `profileError` indicates “no rows found” (Supabase/PostgREST commonly uses code like `PGRST116`), we treat it as “profile missing” (not a fatal error) and proceed to insert.
- If `profileError` is something else (RLS denied, network, schema mismatch), we surface a clear error and stop (so it’s diagnosable rather than silently failing).

3) Insert profile when missing
- Run:
  - `await supabase.from("profiles").insert({ id: user.id, role: "viewer", full_name: user.email })`
- If insert fails due to RLS:
  - Log via `systemLogger`
  - Optionally force logout or show a dedicated “Account provisioning failed” state (to prevent infinite redirect loops).

4) Re-fetch profile and store in app state
- After insert, fetch again with `.single()` and store it.
- Build the app `User` object from:
  - `profile.full_name` (fallback to email)
  - `profile.role` -> map to app roles
- Set `isLoading` only after this completes.

Where we call provisioning
- After successful password login:
  - After `signInWithPassword` returns success, call the provisioning function (which itself uses getUser()).
- After session restore / auth state change:
  - Keep the existing deadlock-safe pattern: inside `onAuthStateChange`, do synchronous state updates only, then `setTimeout(0)` to call provisioning (so no Supabase calls happen inside the callback).

C) App: ensure protected routes never render before provisioning completes
Target file:
- `app/dashboard/layout.tsx` (and possibly root layout if it checks auth)

What we will ensure
- The dashboard layout should not do permission checks while `isLoading` is true.
- It already shows a loading overlay during `isLoading`; we’ll ensure `isLoading` stays true until:
  - session is known AND
  - profile provisioning is complete AND
  - role is loaded into state
This eliminates the “route guard runs too early” class of failures.

D) Roles and route guards: rely on the profile in state
Target file:
- `lib/rbac.ts`
- Already uses `user.role` from auth context. We will ensure `user.role` is derived exclusively from the fetched profile, and never from any cached client-side storage/hardcoded values.

E) Database sanity check (no trigger dependency)
- We will not depend on any DB trigger, regardless of whether `handle_new_user` exists.
- Optional follow-up (only if needed for debugging):
  - Confirm `profiles` has:
    - SELECT self policy (exists)
    - INSERT self policy (should exist from prior migration; if it’s missing or incorrect, profile provisioning will fail)
  - Confirm there is no UPDATE policy that would allow users to change `role`.

Verification checklist (what you should test end-to-end)
1) Existing user with an existing profile row
- Login → should go to `/dashboard` without errors.
- Refresh → should remain logged in.

2) New user with no profile row
- Create user in Supabase Auth (or sign up if enabled) so they can login.
- Login:
  - App should insert a `profiles` row with role `viewer` and `full_name=email`.
  - User should land on `/dashboard` with restricted access if you configured VIEWER restrictions.

3) RLS failure case (to confirm error is clear)
- Temporarily remove/disable the `profiles` INSERT policy (in a test environment)
- Login should fail with a clear provisioning error message (not a silent loop).

Deliverables (what will be changed in code)
- `lib/auth-context.tsx`
  - Replace the current provisioning flow to exactly match:
    - getUser → select single → insert if missing → re-fetch → store in state
  - Add robust “not found” detection for `.single()` errors.
  - Keep the `setTimeout(0)` deferral inside `onAuthStateChange`.

- No other refactors outside auth/provisioning/guards.

Build unblock deliverables (what you will change manually)
- `package.json`: add `build:dev`
- Create `index.html` at project root

If you approve this plan, the next step in default mode is implementing the code changes in `lib/auth-context.tsx` (and any small guard timing fixes in `app/dashboard/layout.tsx` if required) and then re-testing login + refresh flows.
