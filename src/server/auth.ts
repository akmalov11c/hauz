/**
 * Sign-in, identity and sign-out — all server-side.
 *
 * The browser calls these server functions; it never touches Appwrite directly
 * and never sees the session secret. Sign-in is two steps: sendCode emails a
 * code and remembers the issued user id in a short-lived cookie, verifyCode
 * exchanges the code for a session and stores its secret in an httpOnly cookie.
 */

import { createServerFn } from '@tanstack/react-start'
import { ID } from 'node-appwrite'
import { z } from 'zod'

import { adminAccount, sessionAccount } from './appwrite'
import {
  clearPendingUserId,
  clearSessionCookie,
  getPendingUserId,
  getSessionCookie,
  setPendingUserId,
  setSessionCookie,
} from './cookies'

export interface CurrentUser {
  id: string
  email: string
  name: string
}

/** Step one: email a sign-in code and remember the user id it was issued for. */
export const sendCode = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) =>
    z.object({ email: z.email() }).parse(data),
  )
  .handler(async ({ data }) => {
    const token = await adminAccount().createEmailToken(ID.unique(), data.email)
    setPendingUserId(token.userId)
    return { ok: true as const }
  })

/** Step two: exchange the code for a session and store its secret in a cookie. */
export const verifyCode = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) =>
    z.object({ code: z.string().trim().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const userId = getPendingUserId()
    if (!userId) {
      throw new Error('Your code has expired. Request a new one.')
    }

    const session = await adminAccount().createSession(userId, data.code)
    setSessionCookie(session.secret)
    clearPendingUserId()

    return { ok: true as const }
  })

/**
 * The header's source of truth, resolved during SSR so it is right on the first
 * paint. Fails closed: any failure to load the user is treated as signed out,
 * and the cookie is dropped so a broken secret does not linger.
 */
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CurrentUser | null> => {
    const secret = getSessionCookie()
    if (!secret) {
      return null
    }

    try {
      const user = await sessionAccount(secret).get()
      return { id: user.$id, email: user.email, name: user.name }
    } catch {
      clearSessionCookie()
      return null
    }
  },
)

/** Delete the Appwrite session if we can, and always clear the cookie. */
export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const secret = getSessionCookie()
  if (secret) {
    try {
      await sessionAccount(secret).deleteSession('current')
    } catch {
      // Session may already be gone server-side; clearing the cookie is enough.
    }
  }

  clearSessionCookie()
  return { ok: true as const }
})
