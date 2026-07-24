// Jotai state for the photo-share journey. Uses the default store (no Provider):
// the journey is client-only, so cross-request leakage is not a concern. Call
// `resetShare` when entering the journey to clear any leftover state.
import { atom, useSetAtom } from 'jotai'

import type { BloomStage, CaptureMeta, LngLat, Species } from '#/lib/api'

export type ShareStep = 'capture' | 'recognize' | 'detail'

export interface Capture {
  /** Captured image as a data URL (camera frame or album file). */
  dataUrl: string
  meta: CaptureMeta
}

export interface ShareForm {
  bloomStage: BloomStage | null
  locationName: string
  coords: LngLat | null
  description: string
}

export type SubmitState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; id: string }
  | { status: 'error'; message: string }

export const EMPTY_FORM: ShareForm = {
  bloomStage: null,
  locationName: '',
  coords: null,
  description: '',
}

export const stepAtom = atom<ShareStep>('capture')
export const captureAtom = atom<Capture | null>(null)
export const selectedSpeciesAtom = atom<Species | null>(null)
export const formAtom = atom<ShareForm>(EMPTY_FORM)
export const submitStateAtom = atom<SubmitState>({ status: 'idle' })

/** Write-only atom that clears the whole journey back to its initial state. */
export const resetShareAtom = atom(null, (_get, set) => {
  set(stepAtom, 'capture')
  set(captureAtom, null)
  set(selectedSpeciesAtom, null)
  set(formAtom, EMPTY_FORM)
  set(submitStateAtom, { status: 'idle' })
})

export function useResetShare() {
  return useSetAtom(resetShareAtom)
}
