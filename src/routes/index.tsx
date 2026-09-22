import { Link, createFileRoute, useRouteContext } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { user } = useRouteContext({ from: '__root__' })

  return (
    <main className="home">
      <section className="hero">
        <div className="hero__content">
          <span className="eyebrow">Real estate · Uzbekistan</span>
          <h1>Find your place in Uzbekistan</h1>
          <p className="lead muted">
            HAUZ connects property owners and realtors with people looking for
            their next home. Sign in to set up your account and manage your
            profile.
          </p>
          <div className="hero__actions">
            {user ? (
              // Signed in: no sign-in CTAs, just a way into the app.
              <a className="btn btn-lg" href="/profile">
                Go to your profile
              </a>
            ) : (
              <>
                <Link
                  className="btn btn-lg"
                  to="/signin"
                  search={{ redirect: '/profile' }}
                >
                  Get started
                </Link>
                <Link
                  className="btn-secondary btn-lg"
                  to="/signin"
                  search={{ redirect: '/' }}
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
          <ul className="feature-list">
            <li>Email code sign-in — no passwords to remember</li>
            <li>Separate accounts for property owners and realtors</li>
            <li>A public profile you control</li>
          </ul>
        </div>

        <aside className="hero__visual" aria-hidden="true">
          <div className="listing-card">
            <div className="listing-card__image">
              <span className="listing-card__tag">For sale</span>
            </div>
            <div className="listing-card__body">
              <div className="listing-card__price">$145,000</div>
              <div className="listing-card__meta">
                3 rooms · 78 m² · Tashkent, Yunusabad
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}
