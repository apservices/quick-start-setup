
Goal
- Stop relying on database triggers (e.g., public.handle_new_user) to create profiles.
- After every successful Supabase login/session restore, the app must ensure a row exists in public.profiles for auth.user.id.
- Use public.profiles.role as the single source of truth for all in-app permissions/route guards/admin checks.
- Default role for first-time users: viewer (restricted).

Key findings in current codebase
- lib/auth-context.tsx currently derives role from public.user_roles and auto-inserts “model” into user_roles on login.
- Database currently contains a public.handle_new_user() function (and previously there were migrations adjusting it), but there is no guarantee a trigger is active. Regardless, the app must not depend on it.
- public.profiles currently has SELECT policies only (self/admin) and no INSERT policy, meaning the app cannot create profiles under RLS today.
- Route guards use user.role from AuthContext via canAccessRoute() in lib/rbac.ts.

Important build blockers to fix (Lovable build)
1) package.json is missing a build:dev script (Lovable requires it)
- You must add:
  - "build:dev": "vite build --mode development"
  in package.json -> scripts.
2) Project is missing index.html (Lovable requires it)
- You must create an index.html at the project root.
- Note: This repo is a Next.js App Router app; adding index.html/vite build is only to satisfy Lovable’s build requirements (it won’t be used by Next.js in real deployments). If you want, we can keep index.html minimal and non-invasive (static placeholder).

What will change (high level)
A) Database (Supabase) changes
- Add the minimal RLS permissions required for the app to “ensure profile exists”:
  - Allow authenticated users to SELECT their own profile (already exists).
  - Add authenticated INSERT policy for public.profiles (id must equal auth.uid()) so the app can create the row.
  - Optionally add authenticated UPDATE policy for users to update their own full_name/city later (not required by your request, but commonly needed; can be deferred if you want minimal scope).
- Remove/retire trigger dependency:
  - Drop any trigger on auth.users that calls handle_new_user (if present).
  - Optionally drop the public.handle_new_user() function (or leave it unused). Your requirement says “remove dependency”; dropping it reduces confusion.
- Align “admin checks” in RLS (if you want DB policies to also use profiles.role):
  - Create a SECURITY DEFINER helper function like public.has_profile_role(_user_id uuid, _role text) that checks public.profiles.role safely with a fixed search_path.
  - Update existing “admin manages …” policies that currently use public.has_role()/user_roles to instead use profiles.role (directly or via the helper).
  - Special care: policies on public.profiles itself should not self-query without a security definer helper (to avoid recursion). Using a SECURITY DEFINER helper is the safe approach.

B) App changes (Next.js / React)
- Update lib/auth-context.tsx:
  - Remove all user_roles logic (ensureDefaultRole, querying user_roles).
  - After auth succeeds (both signInWithPassword and onAuthStateChange / getSession restore), run:
    1) const userId = session.user.id; const email = session.user.email
    2) SELECT * FROM public.profiles WHERE id = userId (use .maybeSingle())
    3) If no row: INSERT (id, role, full_name) values (userId, 'viewer', email)
    4) Re-fetch (or use inserted row) and set app user.role based on profiles.role
  - Keep the existing “defer extra Supabase calls with setTimeout(0)” pattern inside onAuthStateChange to avoid deadlocks.
  - Add defensive handling:
    - If profile insert fails due to RLS/misconfig, surface a clear error (toast + log via systemLogger) and treat the session as authenticated-but-unprovisioned (optionally force logout or show “Account not provisioned” screen).
- Update lib/types.ts and lib/rbac.ts to support the new role model:
  - Add VIEWER to the frontend UserRole union (since viewer is now a real state).
  - Map profiles.role strings to UserRole:
    - 'admin' -> ADMIN
    - 'model' -> MODEL
    - 'client' -> CLIENT
    - 'viewer' (or anything unknown) -> VIEWER
  - Update PERMISSIONS / canAccessRoute so VIEWER is restricted (per your requirement):
    - Define exactly which routes VIEWER can access (recommend: allow /dashboard only, and show a “pending access” / “contact admin” message; or redirect them to a dedicated restricted page).
  - Ensure DashboardLayout still redirects unauthenticated users to /login, but “authenticated viewer” users remain logged in and simply see access denied for protected sections.

Sequencing / steps to implement
1) Fix Lovable build requirements (user action required)
- Add build:dev script to package.json:
  - "build:dev": "vite build --mode development"
- Create root index.html (minimal placeholder).
  - This is purely to satisfy Lovable’s build pipeline.

2) Database migration (we will implement after you approve in default mode)
- public.profiles:
  - Add INSERT policy for authenticated users to create their own profile row:
    - WITH CHECK (id = auth.uid())
  - (Optional) Add UPDATE policy for authenticated users to update their own profile:
    - USING (id = auth.uid()) WITH CHECK (id = auth.uid())
- Add SECURITY DEFINER function:
  - public.has_profile_role(_user_id uuid, _role text) returns boolean
  - SECURITY DEFINER, STABLE, SET search_path = public
  - Implementation: select exists(select 1 from public.profiles where id=_user_id and role=_role)
- Update “admin manage” RLS policies across tables to use profiles.role (via has_profile_role) instead of user_roles-based has_role.
- Remove trigger dependency:
  - Drop trigger on auth.users if it exists (we’ll check system catalogs during migration).
  - Optionally DROP FUNCTION public.handle_new_user().

3) App code updates (we will implement after DB is ready)
- lib/auth-context.tsx:
  - Replace buildUserFromSession() to fetch/ensure profile then build the User object from profile.role.
  - Remove ensureDefaultRole() and all user_roles queries/inserts.
  - Use .maybeSingle() for profile lookup to avoid “single row” errors.
  - Ensure calls are deferred from onAuthStateChange callback with setTimeout(0).

4) Update role + routing logic
- lib/types.ts:
  - Add "VIEWER" to UserRole.
- lib/rbac.ts:
  - Add VIEWER to permission maps and route guard logic.
  - Ensure route checks align with your new valid roles: admin/model/client + viewer as restricted default.

5) Verification checklist (end-to-end)
- Sign in with an existing user that already has a profile:
  - Ensure role comes from profiles.role and no user_roles calls happen.
- Sign in with a brand-new user (no profile row):
  - App creates public.profiles row (role='viewer', full_name=email).
  - User stays logged in and sees restricted access behavior.
- Refresh the page:
  - Session restores; app again ensures profile exists; no reliance on triggers.
- Confirm route guard behavior:
  - admin/model/client get expected access; viewer is restricted.

Technical notes / edge cases
- If RLS on profiles is strict and INSERT is not allowed, the app cannot create the row; that’s why the INSERT policy is required.
- If you later want “admin upgrades viewer to model/client”, we’ll need an admin-only UPDATE policy on profiles.role (using has_profile_role(auth.uid(),'admin')) and a simple admin UI.
- Using profiles.role as the single source of truth is workable, but it means profiles.role becomes security-sensitive; RLS must prevent users from changing their own role unless they are admin.
  - Therefore: do not add a “self update role” policy, ever.

Scope guardrails (no extra refactors)
- I will only change auth provisioning logic, role derivation, route guards, and the minimal RLS needed for profile provisioning.
- I will not refactor unrelated UI/logic.

