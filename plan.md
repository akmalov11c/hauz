# HAUZ take-home — build plan

Internal working doc. Not part of the required submission (README/NOTES). We can
delete or gitignore before sending, or leave it — harmless either way.

## 0. Ground rules that drive every decision

- **No secrets in the browser.** The Appwrite session secret and the API key
  live only on the server. The browser talks to *our* server functions; the
  server talks to Appwrite with `node-appwrite`.
- **Session secret → httpOnly cookie.** Set/read/cleared only server-side.
- **Profile data only through the Function.** Never touch the
  `personal_accounts` table from the app. Server executes the Function *as the
  user* (client built with `.setSession(secret)`), so Appwrite injects
  `x-appwrite-user-id`. We never send a user id in a body — the Function ignores
  it anyway, and trusting a body-supplied id would be the bug the brief is
  baiting. (Document in NOTES.)
- **Header correct on first paint after hard refresh.** Current user is resolved
  server-side during SSR (root route loader/context), not fetched client-side
  after mount.
- **Fail closed.** If loading the current user throws for any reason: clear the
  cookie, treat as signed out.

## 1. Architecture

```
Browser (no secrets)
  │  calls TanStack Start server functions (createServerFn)
  ▼
Server (Node, has .env: endpoint, projectId, apiKey)
  │  node-appwrite
  ├─ Account: createEmailToken, createSession, get, deleteSession
  └─ Functions.createExecution  →  personal-account Function  →  TablesDB
```

Session lifecycle:
1. `POST email`  → server `account.createEmailToken(ID.unique()|existing, email)`
   sends the code, returns a `userId`. Stash that `userId` (see below).
2. `POST code`   → server `account.createSession(userId, code)` → returns a
   session whose **secret** we write to an httpOnly cookie. Session created.
3. Every authed request → server reads cookie, builds
   `new Client().setSession(secret)`, acts as the user.
4. Log out → `account.deleteSession('current')` + clear cookie.

Carrying `userId` between step 1 and step 2: put it in a short-lived signed/http
only cookie (e.g. `hauz_pending_uid`) so the code-entry screen survives a
refresh and the browser never has to hold it. (Alternative: return it to the
client — but cookie keeps it off the client and is cleaner.)

Cookie names (tentative): `hauz_session` (the session secret),
`hauz_pending_uid` (pending user id during code entry). httpOnly, secure in
prod, `sameSite=lax`, path `/`.

## 2. Server layer (`src/server/`)

- `appwrite.ts` — factories: `adminClient()` (API key, for createEmailToken /
  createSession), `sessionClient(secret)` (setSession, for account.get + function
  execution). Read env with a small guard that throws if missing.
- `cookies.ts` — get/set/clear the two cookies using TanStack Start's
  `getCookie`/`setCookie`/`deleteCookie` (from `@tanstack/react-start/server`).
- `auth.ts` — server functions:
  - `sendCode({ email })` → createEmailToken, set pending-uid cookie.
  - `verifyCode({ code })` → read pending-uid, createSession, set session cookie,
    clear pending-uid.
  - `getCurrentUser()` → read cookie; account.get(); on any throw clear cookie +
    return null. Returns `{ id, email, name }`.
  - `logout()` → deleteSession + clear cookie.
- `account.ts` — server functions that proxy the Function via
  `Functions.createExecution(functionId, body, false, '/personal-account', method)`
  using the session client:
  - `getPersonalAccount()` → GET; map 200 / 404-null.
  - `createPersonalAccount({ firstName, lastName, role })` → POST.
  - `updatePersonalAccount({ firstName?, lastName?, contactEmail?, bio? })` →
    PATCH; caller passes `null` to clear contactEmail/bio.
  - Parse `execution.responseStatusCode` + `responseBody`; surface the
    `{ error, message, issues }` shape to the UI.

Verify exact `node-appwrite@29` signatures when implementing (some are
object-style). Flagged, not assumed.

## 3. Routing & UI (`src/routes/`)

Root (`__root.tsx`):
- `beforeLoad`/loader resolves `getCurrentUser()` into router context so the
  header renders correctly on first SSR paint.
- Render `<Header>`: signed out → "Sign in" link (`/signin?redirect=<current>`);
  signed in → firstName + "Log out" button (calls `logout()` then reloads).

Routes:
- `/signin` — email form → code form (two steps, same screens for new &
  returning). On success: check personal account; if none → `/onboarding`
  (preserving `redirect`); else → `redirect` target (default `/profile` or `/`).
  Reads `redirect` search param (validated).
- `/onboarding` — guard: must be signed in; if account already exists, bounce to
  `redirect`/`/profile`. Form: firstName, lastName, role (property_owner /
  realtor). Submit disabled while pending → **no double POST**. On success go to
  `redirect` target.
- `/profile` — guard: signed out → redirect to `/signin?redirect=/profile`.
  Loads personal account (if 404, send to onboarding). View + edit firstName,
  lastName, contactEmail, bio. **Role shown read-only** (immutable). Empty
  contactEmail/bio inputs map to `null` on submit (clear), not `""`. Untouched
  fields can be omitted. Use TanStack Query mutation; invalidate on success.

Guards: prefer server-side (in loader/beforeLoad throwing `redirect(...)`) so
they hold on hard refresh too.

## 4. Data fetching

- TanStack Query for `personalAccount` and mutations; server functions are the
  query/mutation fns.
- `getCurrentUser` via router context (SSR) — the header's source of truth.
- Invalidate `personalAccount` after create/update.

## 5. Exact task order

Strictly sequential. Each numbered block ends in one commit (no squash). `[ ]`
items are the concrete actions inside that commit. Do not start a block before
the one above it is green.

### Commit 0 — Setup (no app code; env is gitignored)
- [x] 0.1 `npm install`.
- [x] 0.2 Create free Appwrite Cloud project; copy Project ID + endpoint.
- [x] 0.3 Put Project ID into `appwrite.config.json` (project `6ab2…f92f2`,
      endpoint `https://fra.cloud.appwrite.io/v1`).
- [x] 0.4 **CLI auth via API key, not `appwrite login`.** The v27 Cloud
      device-login flow is broken (issues an 8-char code, but the
      `appwrite.io/oauth2/device` page only accepts a 6-char `XXX-XXX` code).
      Bypassed with:
      `npx appwrite client --endpoint <ep> --project-id <id> --key <admin-key>`.
      Needs an admin key with **all scopes** (push failed first with
      `missing scopes (["collections.write"])` — TablesDB uses the underlying
      `collections.*`/`documents.*` scope names). → NOTES.md setup-friction item.
- [x] 0.5 `npm run appwrite:push` — table pushed, Function deployed & ready.
- [ ] 0.6 In Console confirm: Function **ready** (done), Execute access =
      **users**, `main` DB + `personal_accounts` table + unique index exist.
- [ ] 0.7 Create the **app runtime** API key (separate, narrow scopes):
      `sessions.write, users.read, users.write, execution.write`. Copy once.
- [ ] 0.8 `cp .env.example .env`; fill `APPWRITE_ENDPOINT`,
      `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY` (runtime key; keep
      `APPWRITE_FUNCTION_ID`).
- [ ] 0.9 `npm run dev` → http://localhost:3000 loads the placeholder.
- [ ] 0.10 **Security:** delete/regenerate the all-scopes push key + the key that
      was pasted into chat. Keep only the narrow runtime key in `.env`.
- [ ] 0.11 Commit any config change (NOT `.env`). **Commit.**

### Commit 1 — Env + Appwrite client factories
- [ ] 1.1 `src/server/env.ts`: read + validate `APPWRITE_ENDPOINT`,
      `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_FUNCTION_ID`; throw a
      clear error if any is missing.
- [ ] 1.2 `src/server/appwrite.ts`: `adminClient()` (endpoint+project+`setKey`)
      and `sessionClient(secret)` (endpoint+project+`setSession`). Export
      `Account`, `Functions`, `ID` wiring helpers.
- [ ] 1.3 `npm run typecheck` clean. **Commit.**

### Commit 2 — Cookie helpers
- [ ] 2.1 `src/server/cookies.ts`: constants `SESSION_COOKIE='hauz_session'`,
      `PENDING_COOKIE='hauz_pending_uid'`.
- [ ] 2.2 get/set/clear for each using `@tanstack/react-start/server`
      (`getCookie`/`setCookie`/`deleteCookie`); httpOnly, `sameSite=lax`,
      `path=/`, secure when `NODE_ENV==='production'`.
- [ ] 2.3 `npm run typecheck` clean. **Commit.**

### Commit 3 — Auth server functions
- [ ] 3.1 `src/server/auth.ts` with `createServerFn`:
- [ ] 3.2 `sendCode({ email })`: `adminClient` → `account.createEmailToken(
      ID.unique(), email)`; write returned `userId` to pending cookie; return ok.
- [ ] 3.3 `verifyCode({ code })`: read pending cookie → `account.createSession(
      userId, code)`; write session secret to session cookie; clear pending;
      return ok.
- [ ] 3.4 `getCurrentUser()`: read session cookie → `sessionClient` →
      `account.get()`; map to `{ id, email, name }`. On ANY throw: clear session
      cookie, return `null`.
- [ ] 3.5 `logout()`: `sessionClient.deleteSession('current')` (ignore failure);
      clear session cookie.
- [ ] 3.6 `npm run typecheck` clean. **Commit.**

### Commit 4 — Root context + Header (first-paint)
- [ ] 4.1 `__root.tsx`: `beforeLoad` calls `getCurrentUser()`, puts `user` in
      router context; expose via `loader`/context so it renders during SSR.
- [ ] 4.2 `src/components/Header.tsx`: signed out → `Sign in` link to
      `/signin?redirect=<current path>`; signed in → `user.name` (first name) +
      `Log out` button (calls `logout()` then hard-navigates).
- [ ] 4.3 Mount `<Header/>` in `__root.tsx` where the comment is.
- [ ] 4.4 Manual: hard-refresh signed-out and signed-in → header correct on first
      paint, no flash. **Commit.**

### Commit 5 — /signin two-step flow
- [ ] 5.1 `src/routes/signin.tsx`; validate `redirect` search param (default
      `/profile`).
- [ ] 5.2 Step A: email input → `sendCode`; on success show Step B.
- [ ] 5.3 Step B: code input → `verifyCode`; button disabled while pending.
- [ ] 5.4 After verify: call `getPersonalAccount` (added Commit 7) — placeholder
      for now: route to `redirect`. (Wire the has-account branch in Commit 7.)
- [ ] 5.5 Same screens for new and returning users. **Commit.**

### Commit 6 — Onboarding
- [ ] 6.1 `src/routes/onboarding.tsx`; guard: not signed in → redirect to
      `/signin?redirect=/onboarding` (server-side in loader).
- [ ] 6.2 If account already exists → redirect to `redirect`/`/profile`.
- [ ] 6.3 Form: firstName, lastName, role (property_owner|realtor) →
      `createPersonalAccount`.
- [ ] 6.4 Submit button disabled while pending → **no double POST**.
- [ ] 6.5 On success → `redirect` target. **Commit.**

### Commit 7 — Account proxy + /profile
- [ ] 7.1 `src/server/account.ts`: `getPersonalAccount`,
      `createPersonalAccount`, `updatePersonalAccount` via
      `Functions.createExecution(FUNCTION_ID, body, false, '/personal-account',
      method)` on `sessionClient`; parse status + body; 404 → null; surface
      `{error,message,issues}`.
- [ ] 7.2 Wire Commit 5.4 branch: after verify, no account → `/onboarding`, else
      → `redirect`.
- [ ] 7.3 `src/routes/profile.tsx`: loader guards signed-out →
      `/signin?redirect=/profile`; loads account; 404 → `/onboarding`.
- [ ] 7.4 View + edit firstName, lastName, contactEmail, bio (TanStack Query
      mutation; invalidate on success).
- [ ] 7.5 Role rendered **read-only**.
- [ ] 7.6 Empty contactEmail/bio → send `null` (clear); untouched → omit; never
      send `""`. **Commit.**

### Commit 8 — Guards & fail-closed hardening
- [ ] 8.1 Re-verify every route guard holds on hard refresh (server-side).
- [ ] 8.2 Confirm `getCurrentUser` error path clears cookie + shows signed out.
- [ ] 8.3 Confirm `redirect` param honored end-to-end. **Commit.**

### Commit 9 — Polish
- [ ] 9.1 Render Function `issues[]` as field errors on forms.
- [ ] 9.2 Loading/disabled/error states on all async actions. **Commit.**

### Commit 10 — Docs
- [ ] 10.1 `README.md`: exact run steps (this repo's flow).
- [ ] 10.2 `NOTES.md` (≤1 page): user-id-in-body disagreement, role
      immutability, null-clear semantics, first-paint/SSR approach, cookie/secret
      handling, production next steps. **Commit.**

### Commit 11 — Agent artifacts
- [ ] 11.1 Export agent prompts / session.
- [ ] 11.2 List 3 things the agent got wrong that I caught, each linked to the
      fixing commit. **Commit.**

### Final — Submit
- [ ] Run Section 6 checklist top to bottom.
- [ ] Push to a **private** GitHub repo with full history (no squash).

## 6. Manual test checklist (before submit)

- [ ] New user: email → code → onboarding → profile.
- [ ] Returning user: email → code → straight to profile (no onboarding).
- [ ] Hard refresh on any page shows correct header immediately (no flash).
- [ ] `/profile` while signed out → signin → back to `/profile`.
- [ ] Double-click Continue on onboarding creates exactly one account.
- [ ] Clear contactEmail and bio → they read back empty (null), not "".
- [ ] Role not editable on profile.
- [ ] Log out → header shows "Sign in"; protected routes bounce.
- [ ] Session secret / API key not present anywhere in browser (check cookies are
      httpOnly, check no secret in page source / network responses to client).
- [ ] `redirect` param honored after sign-in.
- [ ] Corrupt/expired cookie → treated as signed out, cookie cleared.

## 7. Open questions to confirm while building

- Exact `node-appwrite@29` method signatures (object vs positional args).
- Whether `Functions.createExecution` as a session client reliably injects
  `x-appwrite-user-id` (expected yes; verify against a real execution).
- Email OTP: `createEmailToken` requires a userId — use `ID.unique()` for the
  first attempt and reuse the returned id via the pending cookie.
```
