import { useEffect, useState } from 'react'
import { Show, SignInButton, SignUpButton } from '@clerk/tanstack-react-start'
import { useSetAtom } from 'jotai'

import { guestModeAtom, useViewer } from '#/features/auth/guest'

/**
 * Gate for login-required routes: renders children for signed-in users AND
 * guests (以访客身份继续). Pair it with <AuthOverlay/>, which fills the
 * signed-out case. Must render inside ClientOnly — auth state is client-only.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useViewer()
  if (status === 'signed-out') return null
  return <>{children}</>
}

export function AuthOverlay() {
  const { status } = useViewer()
  const setGuest = useSetAtom(guestModeAtom)

  // Clerk's middleware can SSR the signed-out overlay, but the guest flag
  // lives in localStorage — hiding it on the first client render would be a
  // hydration mismatch. Gate the guest check behind a mounted flag (the SSR
  // safety convention), so returning guests see at most a one-frame overlay.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Guests count as authenticated — no overlay. (Clerk's <Show> below only
  // knows about real sessions, so the guest check happens here.)
  if (mounted && status === 'guest') return null

  return (
    <>
      <Show when="signed-out">
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="t-modal-in mx-6 flex w-full max-w-xs flex-col items-center gap-6 rounded-3xl bg-white px-6 py-7 text-center shadow-[0_8px_24px_rgba(214,138,95,.18)] ring-1 ring-black/5">
            <img src="/logotype.svg" className="h-10 mb-2 mt-2" role="img" aria-label="見頃" />{' '}
            <div className="flex w-full flex-col gap-2">
              {/* Strongest emphasis — demo visitors should tap this first.
                  Entering guest mode dismisses the overlay everywhere and the
                  API client starts sending `Authorization: Guest`. */}
              <button
                type="button"
                onClick={() => setGuest(true)}
                className="w-full rounded-full bg-accent py-3 text-sm font-medium text-white t-press"
              >
                以访客身份继续
              </button>
              {/* Secondary emphasis — brand celadon pill. */}
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="w-full rounded-full bg-celadon py-3 text-sm text-ink t-press"
                >
                  创建账户
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="w-full rounded-full bg-ink/5 py-3 text-sm text-ink t-press"
                >
                  登录
                </button>
              </SignInButton>
            </div>
          </div>
        </div>
      </Show>
    </>
  )
}
