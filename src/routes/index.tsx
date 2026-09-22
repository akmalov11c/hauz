import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
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
            <a className="btn btn-lg" href="/signin?redirect=%2Fprofile">
              Get started
            </a>
            <a className="btn-secondary btn-lg" href="/signin?redirect=%2Fprofile">
              Sign in
            </a>
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
