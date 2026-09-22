import { useMutation } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'

import { safeRedirect } from '#/lib/redirect'
import { createPersonalAccount } from '#/server/account'

export const Route = createFileRoute('/onboarding')({
  validateSearch: (search: Record<string, unknown>) =>
    z.object({ redirect: z.string().optional() }).parse(search),
  beforeLoad: ({ context, search }) => {
    if (!context.user) {
      throw redirect({ to: '/signin', search: { redirect: '/onboarding' } })
    }
    if (context.account) {
      // Already onboarded: skip straight to where they were headed.
      throw redirect({ href: safeRedirect(search.redirect, '/profile') })
    }
  },
  component: Onboarding,
})

const ROLES = [
  { value: 'property_owner', label: 'Property owner' },
  { value: 'realtor', label: 'Realtor' },
] as const

function Onboarding() {
  const { redirect: redirectParam } = Route.useSearch()
  const target = safeRedirect(redirectParam, '/profile')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<'property_owner' | 'realtor'>('property_owner')

  const create = useMutation({
    mutationFn: () =>
      createPersonalAccount({ data: { firstName, lastName, role } }),
    onSuccess: () => {
      // Full navigation so the root reloads the new account into context.
      window.location.assign(target)
    },
  })

  return (
    <main className="auth-layout">
      <div className="card auth-card">
        <div className="card__header">
          <h1>Set up your account</h1>
          <p className="muted">
            Tell us who you are. Your role can’t be changed later.
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            create.mutate()
          }}
        >
          {create.isError && (
            <div className="alert alert-error" role="alert">
              {create.error instanceof Error
                ? create.error.message
                : 'Could not create your account. Try again.'}
            </div>
          )}

          <div className="form-field">
            <label htmlFor="firstName">First name</label>
            <input
              id="firstName"
              required
              autoFocus
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="lastName">Last name</label>
            <input
              id="lastName"
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as 'property_owner' | 'realtor')
              }
            >
              {ROLES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-block" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Continue'}
          </button>
        </form>
      </div>
    </main>
  )
}
