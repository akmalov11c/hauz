import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'

import { Header } from '#/components/Header'
import { getPersonalAccount } from '#/server/account'
import { getCurrentUser } from '#/server/auth'

import appCss from '../styles.css?url'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // Resolve the signed-in user and their personal account during SSR and put
  // both in context, so the header shows the right first name and child-route
  // guards work on the first paint after a hard refresh.
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) {
      return { user: null, account: null }
    }

    try {
      const account = await getPersonalAccount()
      return { user, account }
    } catch {
      // Never let an account-load failure break every page; treat as "no
      // account", which routes onboarding-required users to onboarding.
      return { user, account: null }
    }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'HAUZ' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
