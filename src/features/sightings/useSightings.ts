// SWR-backed sightings query, keyed by the selected species + selected day.
// Both the map marker layer and the home page read this; SWR dedups by key so
// there is a single fetch per (species, day).
import { useAtomValue } from 'jotai'
import useSWR from 'swr'

import { api } from '#/lib/api'
import type { Sighting } from '#/lib/api'
import { selectedSpeciesAtom } from '#/features/species/state'
import { dayKey, mapBoundsAtom, selectedDayAtom } from './state'

export interface SightingsResult {
  sightings: Sighting[]
  count: number
  isLoading: boolean
  error: unknown
}

/** Coarse bbox key (~2 decimals ≈ 1km) so small pans don't refetch. */
function bboxKey(bbox: [number, number, number, number] | null): string {
  if (!bbox) return 'none'
  return bbox.map(n => n.toFixed(2)).join(',')
}

export function useSightings(): SightingsResult {
  const species = useAtomValue(selectedSpeciesAtom)
  const day = useAtomValue(selectedDayAtom)
  const bounds = useAtomValue(mapBoundsAtom)
  const date = dayKey(day)
  const speciesId = species?.id

  const { data, error, isLoading } = useSWR(
    ['sightings', speciesId ?? 'all', date, bboxKey(bounds)],
    () => api.listSightings({ speciesId, date, bbox: bounds ?? undefined }),
  )

  const sightings = data ?? []
  return { sightings, count: sightings.length, isLoading, error }
}
