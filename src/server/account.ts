/**
 * The web app's only door to personal-account data: it calls the Appwrite
 * Function, never the personal_accounts table. Every call executes the Function
 * as the signed-in user (session client), so Appwrite injects the caller's
 * identity as x-appwrite-user-id and the app never sends a user id in a body.
 */

import { createServerFn } from '@tanstack/react-start'
import { ExecutionMethod } from 'node-appwrite'
import { z } from 'zod'

import { sessionFunctions } from './appwrite'
import { getSessionCookie } from './cookies'
import { getEnv } from './env'

export interface PersonalAccount {
  personalAccountId: string
  firstName: string
  lastName: string
  role: 'property_owner' | 'realtor'
  contactEmail: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
}

function requireSecret(): string {
  const secret = getSessionCookie()
  if (!secret) {
    throw new Error('You are not signed in.')
  }
  return secret
}

interface FunctionResult {
  status: number
  body: unknown
}

/** Execute one route of the Function as the signed-in user. */
async function callFunction(
  secret: string,
  method: ExecutionMethod,
  body?: unknown,
): Promise<FunctionResult> {
  const execution = await sessionFunctions(secret).createExecution(
    getEnv().functionId,
    body === undefined ? '' : JSON.stringify(body),
    false, // synchronous: we need the response body back
    '/personal-account',
    method,
  )

  let parsed: unknown = null
  if (execution.responseBody) {
    try {
      parsed = JSON.parse(execution.responseBody)
    } catch {
      parsed = null
    }
  }

  return { status: execution.responseStatusCode, body: parsed }
}

/** Turn the Function's { error, message, issues } into a readable Error. */
function toError(body: unknown, fallback: string): Error {
  if (body && typeof body === 'object') {
    const b = body as { message?: string; issues?: Array<{ message?: string }> }
    const issues = b.issues?.map((issue) => issue.message).filter(Boolean)
    if (issues && issues.length > 0) {
      return new Error(issues.join(' '))
    }
    if (b.message) {
      return new Error(b.message)
    }
  }
  return new Error(fallback)
}

/** 200 with the account, or null when the caller has none yet (404). */
export const getPersonalAccount = createServerFn({ method: 'GET' }).handler(
  async (): Promise<PersonalAccount | null> => {
    const { status, body } = await callFunction(requireSecret(), ExecutionMethod.GET)
    if (status === 200) {
      return body as PersonalAccount
    }
    if (status === 404) {
      return null
    }
    throw toError(body, 'Could not load your account.')
  },
)

export const createPersonalAccount = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    z
      .object({
        firstName: z.string().trim().min(1),
        lastName: z.string().trim().min(1),
        role: z.enum(['property_owner', 'realtor']),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<PersonalAccount> => {
    const { status, body } = await callFunction(
      requireSecret(),
      ExecutionMethod.POST,
      data,
    )
    // 201 created, 200 if it already existed with the same role.
    if (status === 200 || status === 201) {
      return body as PersonalAccount
    }
    throw toError(body, 'Could not create your account.')
  })

/**
 * The profile form sends all four editable fields every time: firstName and
 * lastName as non-empty strings, contactEmail and bio as a value or null. null
 * clears an optional field; the empty string is never sent (the Function
 * rejects it). Role is not editable and is never sent.
 */
export const updatePersonalAccount = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    z
      .object({
        firstName: z.string().trim().min(1),
        lastName: z.string().trim().min(1),
        contactEmail: z.string().trim().email().nullable(),
        bio: z.string().trim().min(1).nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<PersonalAccount> => {
    const { status, body } = await callFunction(
      requireSecret(),
      ExecutionMethod.PATCH,
      data,
    )
    if (status === 200) {
      return body as PersonalAccount
    }
    throw toError(body, 'Could not save your profile.')
  })
