// Guest mode (以访客身份继续) — a persisted client-side flag that lets the app
// talk to the backend with `Authorization: Guest` (no Bearer) instead of a
// Clerk session. The backend maps every guest request onto one shared identity
// whose userId is the literal string 'guest' (undocumented in Swagger;
// confirmed by probing: publish returns authorId "guest", 我的帖子 is
// GET /api/users/guest/posts, and PATCH on guest posts succeeds). All guests
// therefore share the same posts — that is backend design, not a bug.
import { useEffect } from 'react'
import { atomWithStorage } from 'jotai/utils'
import { useAtom } from 'jotai'
import { useUser } from '@clerk/tanstack-react-start'

/** The backend's fixed identity for every guest request (lowercase). */
export const GUEST_USER_ID = 'guest'

const STORAGE_KEY = 'migoro:guest-mode'

/**
 * Whether the visitor chose 以访客身份继续. Persisted in localStorage so guest
 * mode survives reloads and PWA relaunches. `getOnInit` reads the stored value
 * synchronously on the client; every consumer renders inside `ClientOnly` or
 * Clerk's `<Show>` (both client-resolved), so there is no hydration mismatch.
 */
export const guestModeAtom = atomWithStorage(STORAGE_KEY, false, undefined, {
  getOnInit: true,
})

/**
 * Non-hook, synchronous guest check for plain call sites (the API client).
 * Reads localStorage directly so it stays in lockstep with `guestModeAtom`'s
 * persisted value; returns false during SSR (no `window`).
 */
export function isGuestMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'false') === true
  } catch {
    return false
  }
}

export interface Viewer {
  status: 'signed-in' | 'guest' | 'signed-out'
  /** Clerk user id, `'guest'` in guest mode, or undefined when signed out. */
  userId: string | undefined
}

/**
 * Unified auth state: a real Clerk session wins over guest mode, guest mode
 * wins over signed-out. Signing in clears the guest flag so a later sign-out
 * lands back on the auth overlay instead of silently degrading to guest.
 */
export function useViewer(): Viewer {
  const { user } = useUser()
  const [isGuest, setGuest] = useAtom(guestModeAtom)

  useEffect(() => {
    if (user && isGuest) setGuest(false)
  }, [user, isGuest, setGuest])

  if (user) return { status: 'signed-in', userId: user.id }
  if (isGuest) return { status: 'guest', userId: GUEST_USER_ID }
  return { status: 'signed-out', userId: undefined }
}
