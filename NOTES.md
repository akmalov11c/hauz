# Notes

## Main decisions

**Secrets never reach the browser.** The Appwrite session secret is kept in an
httpOnly cookie and the API key stays on the server. The browser only calls
TanStack Start server functions (`src/server/`); it never holds a secret and
never talks to Appwrite directly.

**Two client authorities.** `adminAccount()` (API key) is used only to start a
sign-in — send an email code and exchange it for a session. Everything
authenticated uses `sessionClient(secret)` built from the cookie, so calls act
as the user rather than as an admin.

**Identity from the session, not the body.** Profile reads and writes execute
the Function as the signed-in user, so Appwrite injects `x-appwrite-user-id`.
This is why the app never reads or writes the `personal_accounts` table
directly, and why no user id is ever sent in a request body (see the
disagreement below).

**Right on the first paint.** The root `beforeLoad` resolves the user *and* their
personal account during SSR and puts both in router context, so the header shows
the correct state (and first name) on a hard refresh instead of flipping after
hydration. Route guards run in `beforeLoad` too, so they also hold on refresh.

**Fail closed.** If loading the current user throws for any reason,
`getCurrentUser` clears the session cookie and returns null — the person is
treated as signed out.

**Onboarding is idempotent.** The Continue button is disabled while the request
is in flight, and the Function's unique index plus its own retry handling mean a
double-click can never create two accounts.

**Null clears, empty is never sent.** Profile always submits first/last name as
non-empty strings and contact email/bio as a value or `null`. An empty input
maps to `null` (clear); `""` is never sent, matching the Function's rules.

**Role is set once.** It is chosen at onboarding, shown read-only on the profile,
and never included in a PATCH.

**Redirects are guarded.** After sign-in the person goes to the `redirect` query
param, but only if it is an internal path — an open-redirect guard
(`src/lib/redirect.ts`) rejects absolute or protocol-relative URLs.

## Where I departed from the brief

**"The profile form should send the signed-in user's id along with the
changes."** I did not do this. The Function derives identity from the Appwrite
session (`x-appwrite-user-id`) and ignores anything in the body, so a client-sent
id is at best dead weight and at worst a way to attempt editing someone else's
profile. The app sends only the changed fields; identity comes from the session.

## The Function

Unchanged. The routes and error shape matched what the UI needed, so there was
no reason to modify it.

## One framework quirk worth recording

Setting two cookies in a single server-function response silently broke sign-in:
the two `Set-Cookie` headers were collapsed into one malformed header and the
browser dropped both. The fix is to emit a single `Set-Cookie` per response; the
short-lived pending-sign-in cookie self-expires instead of being explicitly
cleared.

## What I would do next for production

- **Stop calling the Function on every navigation.** The account is loaded in the
  root loader on each page. I would cache it (per-session) or fold it into the
  user lookup so a page load is one round-trip, not two.
- **CSRF + rate limiting.** Add CSRF protection to the mutating server functions
  and rate-limit code resends beyond what Appwrite already does.
- **Field-level errors.** The Function returns `issues[]`; I would map those to
  the specific form fields instead of showing one combined message.
- **Session lifecycle.** Handle expiry/rotation explicitly and add a small buffer
  before the 30-day cookie max-age.
- **Tests.** Unit-test the redirect guard and cookie logic; an end-to-end test
  for the sign-in → onboarding → profile flow.
