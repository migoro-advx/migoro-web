import { Show, SignInButton, SignUpButton } from '@clerk/tanstack-react-start'

import { BrandLogo } from '#/brand'

export function AuthOverlay() {
  return (
    <>
      <Show when="signed-out">
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="t-modal-in mx-6 flex w-full max-w-xs flex-col items-center gap-6 rounded-3xl bg-white px-6 py-7 text-center shadow-[0_8px_24px_rgba(214,138,95,.18)] ring-1 ring-black/5">
            <img src="/logotype.svg" className="h-10 mb-2 mt-2" role="img" aria-label="見頃" />{' '}
            <div className="flex w-full flex-col gap-2">
              {/* Strongest emphasis — demo visitors should tap this first.
                  TODO: guest mode — wire up 以访客身份继续 (dismiss the overlay
                  and browse without an account) once the feature lands. */}
              <button
                type="button"
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
