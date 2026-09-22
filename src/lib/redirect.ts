/**
 * Only ever redirect to an internal path. A value like `//evil.com` or
 * `https://evil.com` would be an open redirect, so anything that is not a
 * single-slash-rooted path falls back to a safe default.
 */
export function safeRedirect(redirect: string | undefined, fallback = '/'): string {
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return redirect
  }
  return fallback
}
