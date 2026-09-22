import { useMutation } from '@tanstack/react-query'
import {
  createFileRoute,
  redirect,
  useRouteContext,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'

import type { PersonalAccount } from '#/server/account'
import { updatePersonalAccount } from '#/server/account'

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/signin', search: { redirect: '/profile' } })
    }
    if (!context.account) {
      throw redirect({ to: '/onboarding', search: { redirect: '/profile' } })
    }
  },
  component: Profile,
})

function roleLabel(role: string): string {
  return role === 'realtor' ? 'Realtor' : 'Property owner'
}

function Profile() {
  const { account } = useRouteContext({ from: '__root__' })

  // beforeLoad guarantees an account; this only narrows the type. Rendering the
  // form as its own component keeps all hooks below unconditional.
  if (!account) {
    return null
  }

  return <ProfileForm account={account} />
}

function ProfileForm({ account }: { account: PersonalAccount }) {
  const router = useRouter()

  const [firstName, setFirstName] = useState(account.firstName)
  const [lastName, setLastName] = useState(account.lastName)
  const [contactEmail, setContactEmail] = useState(account.contactEmail ?? '')
  const [bio, setBio] = useState(account.bio ?? '')

  const save = useMutation({
    mutationFn: () =>
      updatePersonalAccount({
        data: {
          firstName,
          lastName,
          // Empty means "clear this optional field": send null, never "".
          contactEmail: contactEmail.trim() === '' ? null : contactEmail.trim(),
          bio: bio.trim() === '' ? null : bio.trim(),
        },
      }),
    onSuccess: async () => {
      // Refresh context.account so the header and this form reflect the save.
      await router.invalidate()
    },
  })

  return (
    <main className="page">
      <h1>Your profile</h1>
      <p className="muted">
        Role: <strong>{roleLabel(account.role)}</strong> — set at sign-up and
        cannot be changed.
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate()
        }}
      >
        {save.isError && (
          <div className="alert alert-error" role="alert">
            {save.error instanceof Error
              ? save.error.message
              : 'Could not save your profile. Try again.'}
          </div>
        )}
        {save.isSuccess && !save.isPending && (
          <div className="alert alert-success" role="status">
            Profile saved.
          </div>
        )}

        <div className="form-field">
          <label htmlFor="firstName">First name</label>
          <input
            id="firstName"
            required
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
          <label htmlFor="contactEmail">Contact email</label>
          <input
            id="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            placeholder="Optional"
          />
          <p className="field-hint">Leave empty to remove it.</p>
        </div>

        <div className="form-field">
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Optional"
          />
          <p className="field-hint">Leave empty to remove it.</p>
        </div>

        <button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </main>
  )
}
