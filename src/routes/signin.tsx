import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'

import { safeRedirect } from '#/lib/redirect'
import { getPersonalAccount } from '#/server/account'
import { sendCode, verifyCode } from '#/server/auth'

export const Route = createFileRoute('/signin')({
  validateSearch: (search: Record<string, unknown>) =>
    z.object({ redirect: z.string().optional() }).parse(search),
  component: SignIn,
})

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function SignIn() {
  const { redirect } = Route.useSearch()
  const target = safeRedirect(redirect)

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')

  const send = useMutation({
    mutationFn: (value: string) => sendCode({ data: { email: value } }),
    onSuccess: () => setStep('code'),
  })

  const verify = useMutation({
    mutationFn: (value: string) => verifyCode({ data: { code: value } }),
    onSuccess: async () => {
      // Session cookie is set now, so this runs as the signed-in user. A new
      // user has no personal account yet and goes to onboarding (carrying the
      // final target); a returning user goes straight there. Full navigation so
      // the server re-reads the cookie and renders the signed-in header.
      const account = await getPersonalAccount()
      if (account) {
        window.location.assign(target)
      } else {
        window.location.assign(
          `/onboarding?redirect=${encodeURIComponent(target)}`,
        )
      }
    },
  })

  return (
    <main className="auth-layout">
      <div className="card auth-card">
        <div className="card__header">
          <h1>Sign in</h1>
          <p className="muted">
            {step === 'email'
              ? 'Enter your email and we’ll send you a sign-in code.'
              : `We sent a code to ${email}. Enter it below.`}
          </p>
        </div>

        {step === 'email' ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              send.mutate(email)
            }}
          >
            {send.isError && (
              <div className="alert alert-error" role="alert">
                {errorMessage(send.error, 'Could not send the code. Try again.')}
              </div>
            )}

            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              className="btn-block"
              disabled={send.isPending}
            >
              {send.isPending ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              verify.mutate(code)
            }}
          >
            {verify.isError && (
              <div className="alert alert-error" role="alert">
                {errorMessage(verify.error, 'That code did not work. Try again.')}
              </div>
            )}

            <div className="form-field">
              <label htmlFor="code">Sign-in code</label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
              />
            </div>

            <button
              type="submit"
              className="btn-block"
              disabled={verify.isPending}
            >
              {verify.isPending ? 'Verifying…' : 'Continue'}
            </button>

            <button
              type="button"
              className="btn-secondary btn-block"
              style={{ marginTop: '0.6rem' }}
              onClick={() => {
                setCode('')
                setStep('email')
                verify.reset()
              }}
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
