# Agent notes

I used an AI coding agent (Claude Code) throughout this task. The full session
transcript is exported alongside this repo. This file lists three things the
agent got wrong that I caught in review or testing, each linked to the commit
that fixes it.

Repo: https://github.com/akmalov11c/hauz

## 1. Two `Set-Cookie` headers in one response silently broke sign-in

The agent wrote `verifyCode` to set the session cookie **and** clear the pending
sign-in cookie in the same server-function response. TanStack/H3 collapsed the
two `Set-Cookie` headers into one malformed header, so the browser dropped both
— sign-in appeared to succeed but the header never showed a signed-in state.

I found it by instrumenting the server functions: the logs showed the session
secret was created (length 396) yet the session cookie was never present on the
next request, and the pending cookie was never cleared either. Fix: emit a
single `Set-Cookie` per response and let the short-lived pending cookie
self-expire.

Fixed in [`71f869d`](https://github.com/akmalov11c/hauz/commit/71f869d).

## 2. Deprecated `inputValidator()` on server functions

The agent used `createServerFn().inputValidator()`, which the TanStack Start
plugin flags as deprecated on every reload. Caught from the dev-server warnings;
switched both auth server functions to `.validator()`.

Fixed in [`26fc993`](https://github.com/akmalov11c/hauz/commit/26fc993).

## 3. Rules-of-hooks violation in the profile page

The agent's first version of `profile.tsx` had an `if (!account) return null`
guard placed **before** the `useState` calls, so the hooks would run
conditionally — a rules-of-hooks violation that typecheck does not catch but that
breaks React at runtime when the value toggles. I caught it reading the diff
before committing and split the component into a guard wrapper plus an inner form
component, so every hook runs unconditionally.

The corrected version is in
[`047742d`](https://github.com/akmalov11c/hauz/commit/047742d).

## Honorable mention (process)

The agent amended an already-pushed commit while folding in a fix, which
diverged local history from the remote. Rather than force-push over published
history, I reconciled by replaying the new work onto the pushed commit and
adding the fix as its own commit — no history rewrite.
