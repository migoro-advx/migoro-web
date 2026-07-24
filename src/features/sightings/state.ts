// Jotai state for the sightings (实况) feature. Uses the default store (no
// Provider): the map and its overlays are client-only and interactive, so
// there is no cross-request leakage concern.
import { atom } from 'jotai'

/** Local calendar-day key (YYYY-MM-DD) for a Date, used as the query day. */
export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Start-of-today, so the default day matches the TimeDial's initial apex. */
function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * The day currently selected on the TimeDial — single source of truth shared by
 * the map layer, the empty-state card, and the dial's own subtitle.
 */
export const selectedDayAtom = atom<Date>(startOfToday())

/**
 * Human-readable place name for the 定位胶囊, resolved from the map center via
 * reverse geocoding. `null` until it resolves (chip stays hidden).
 */
export const placeNameAtom = atom<string | null>(null)

/**
 * Current map viewport as [west, south, east, north] (WGS84), updated by the
 * map on load/moveend. Sightings are queried within these bounds so points
 * always render in the region the user is actually viewing. `null` until the
 * map has loaded.
 */
export const mapBoundsAtom = atom<[number, number, number, number] | null>(null)
