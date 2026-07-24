// Jotai state for the species-query feature. Uses the default store (no
// Provider): the query overlay is client-only and interactive, so there is no
// cross-request leakage concern (defaults render identically on the server).
import { atom } from 'jotai'

import type { Species } from '#/lib/api'

/**
 * The species currently used as the map filter. `null` means the overview
 * (no filter). The map will consume this once marker filtering is wired up.
 */
export const selectedSpeciesAtom = atom<Species | null>(null)

/** Whether the full-screen species-query overlay is open. */
export const queryOpenAtom = atom<boolean>(false)
