/**
 * The two cookies this app sets, and typed helpers to read/set/clear them.
 *
 * hauz_session   the Appwrite session secret. httpOnly, so browser JavaScript
 *                can never read it — every authenticated call goes through a
 *                server function that reads this cookie server-side.
 * hauz_pending   the Appwrite user id issued when a sign-in code is sent, held
 *                between the "enter email" and "enter code" steps. Short-lived,
 *                and off the client for the same reason.
 *
 * Both are httpOnly, sameSite=lax, path=/, and secure in production.
 */

import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'

export const SESSION_COOKIE = 'hauz_session'
export const PENDING_COOKIE = 'hauz_pending_uid'

const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const PENDING_MAX_AGE = 60 * 10 // 10 minutes

const baseOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
}

export function getSessionCookie(): string | undefined {
  return getCookie(SESSION_COOKIE)
}

export function setSessionCookie(secret: string): void {
  setCookie(SESSION_COOKIE, secret, { ...baseOptions, maxAge: SESSION_MAX_AGE })
}

export function clearSessionCookie(): void {
  deleteCookie(SESSION_COOKIE, baseOptions)
}

export function getPendingUserId(): string | undefined {
  return getCookie(PENDING_COOKIE)
}

export function setPendingUserId(userId: string): void {
  setCookie(PENDING_COOKIE, userId, { ...baseOptions, maxAge: PENDING_MAX_AGE })
}

export function clearPendingUserId(): void {
  deleteCookie(PENDING_COOKIE, baseOptions)
}
