import { Link, useLocation, useRouteContext, useRouter } from '@tanstack/react-router'

import { logout } from '#/server/auth'

/**
 * Shown on every page. The signed-in/signed-out split is driven by `user` from
 * the root route context, which is resolved during SSR, so the header is right
 * on the first paint after a hard refresh rather than flipping after hydration.
 */
export function Header() {
  const router = useRouter()
  const location = useLocation()
  const { user } = useRouteContext({ from: '__root__' })

  async function handleLogout() {
    await logout()
    // Re-run beforeLoad so `user` becomes null and the header updates.
    await router.invalidate()
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          <span className="brand__mark" aria-hidden="true">
            H
          </span>
          <span>HAUZ</span>
        </Link>

        <nav>
          {user ? (
            <>
              {/* TODO(Commit 7): show the personal account's firstName from the
                  Function instead of the Appwrite account name/email. */}
              <span className="user-name">{user.name || user.email}</span>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          ) : (
            // Plain anchor for now; becomes a typed <Link to="/signin"> once
            // that route exists (Commit 5). Full reload here is harmless.
            <a
              className="btn-secondary"
              href={`/signin?redirect=${encodeURIComponent(location.href)}`}
            >
              Sign in
            </a>
          )}
        </nav>
      </div>
    </header>
  )
}
