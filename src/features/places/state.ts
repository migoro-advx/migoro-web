// Jotai state for the places (地点) feature. Uses the default store (no
// Provider): the panel is client-only and interactive, so there is no
// cross-request leakage concern.
import { atom } from 'jotai'

/**
 * The place whose half-screen panel is open, or `null` when the panel is
 * closed. Set by tapping a map marker/cluster; cleared on dismiss.
 */
export const activePlaceIdAtom = atom<string | null>(null)
