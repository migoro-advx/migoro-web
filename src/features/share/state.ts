// Jotai state for the photo-share journey. Uses the default store (no Provider):
// the journey is client-only, so cross-request leakage is not a concern. Call
// `resetShare` when entering the journey to clear any leftover state.
import { atom, useSetAtom } from 'jotai'

import type { BloomStage, CaptureMeta, LngLat, Species } from '#/lib/api'

export type ShareStep = 'capture' | 'recognize' | 'location' | 'detail' | 'success'

export interface Capture {
  /** Captured image as a data URL (camera frame or album file). */
  dataUrl: string
  meta: CaptureMeta
}

export interface ShareForm {
  bloomStage: BloomStage | null
  locationName: string
  /** Finer-grained area within the place, e.g. "湖畔入口 · 东侧花带". */
  areaName: string
  coords: LngLat | null
}

export type SubmitState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; id: string }
  | { status: 'error'; message: string }

export const EMPTY_FORM: ShareForm = {
  bloomStage: null,
  locationName: '',
  areaName: '',
  coords: null,
}

export const stepAtom = atom<ShareStep>('capture')
export const captureAtom = atom<Capture | null>(null)
export const selectedSpeciesAtom = atom<Species | null>(null)
export const formAtom = atom<ShareForm>(EMPTY_FORM)
export const submitStateAtom = atom<SubmitState>({ status: 'idle' })

/**
 * Whether the user has manually edited the place name. Persisted across steps
 * (not component-local) so navigating back into the location step doesn't let
 * reverse-geocoding overwrite a hand-typed name.
 */
export const locationEditedAtom = atom(false)

/** Write-only atom that clears the whole journey back to its initial state. */
export const resetShareAtom = atom(null, (_get, set) => {
  set(stepAtom, 'capture')
  set(captureAtom, null)
  set(selectedSpeciesAtom, null)
  set(formAtom, EMPTY_FORM)
  set(submitStateAtom, { status: 'idle' })
  set(locationEditedAtom, false)
})

export function useResetShare() {
  return useSetAtom(resetShareAtom)
}
