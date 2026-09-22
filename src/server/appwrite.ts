/**
 * Appwrite client factories, one per kind of authority.
 *
 * adminAccount() carries the API key. It is used only to begin a sign-in: send
 * an email code and exchange it for a session. It is never proof of who is
 * calling.
 *
 * sessionAccount()/sessionFunctions() act as the signed-in user, built from the
 * session secret we keep in an httpOnly cookie. Every authenticated read and
 * every Function execution goes through these, so Appwrite injects
 * x-appwrite-user-id from the session itself rather than from anything the
 * browser supplied.
 */

import { Account, Client, Functions } from 'node-appwrite'

import { getEnv } from './env'

function baseClient(): Client {
  const { endpoint, projectId } = getEnv()
  return new Client().setEndpoint(endpoint).setProject(projectId)
}

/** Admin authority (API key). Only for starting a sign-in. */
export function adminAccount(): Account {
  return new Account(baseClient().setKey(getEnv().apiKey))
}

/** Acts as the signed-in user, from their session secret. */
export function sessionAccount(sessionSecret: string): Account {
  return new Account(baseClient().setSession(sessionSecret))
}

/** Executes the personal-account Function as the signed-in user. */
export function sessionFunctions(sessionSecret: string): Functions {
  return new Functions(baseClient().setSession(sessionSecret))
}
