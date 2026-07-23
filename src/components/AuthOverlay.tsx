import { Show, SignInButton, SignUpButton } from '@clerk/tanstack-react-start'

import { BRAND_NAME, BrandLogo } from '#/brand'

export function AuthOverlay() {
  return (
    <>
      <Show when="signed-out">
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="flex w-full flex-col items-center gap-6 bg-white/95 px-6 py-8 text-center shadow-2xl ring-1 ring-black/5">
            <BrandLogo className="h-16 w-16" />
            <h1 className="text-3xl font-semibold tracking-wide text-gray-900">{BRAND_NAME}</h1>
            <div className="flex w-full flex-col gap-3">
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="w-full rounded-full border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-900 transition-colors hover:bg-gray-50"
                >
                  创建账户
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="w-full rounded-full bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
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
