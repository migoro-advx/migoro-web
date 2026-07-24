// Reverse geocoding via MapTiler. Turns a MapTiler LngLat ([lng, lat], WGS84)
// into a human-readable zh-CN place name. Uses @maptiler/client (fetch-based,
// SSR-safe) rather than @maptiler/sdk, which touches browser globals at import.
//
// This is a MapTiler service, not our own backend, so it does not go through
// the mock/real API shell. Failures resolve to null so callers can fall back to
// a manually entered location.
import { geocoding } from '@maptiler/client'

import type { LngLat } from '#/lib/api'

export async function reverseGeocode(coords: LngLat): Promise<string | null> {
  const apiKey = import.meta.env.VITE_MAPTILER_API_KEY
  if (!apiKey) return null
  try {
    const result = await geocoding.reverse(coords, { apiKey, language: 'zh' })
    return result.features[0]?.place_name ?? null
  } catch (error) {
    console.warn('Reverse geocoding failed:', error)
    return null
  }
}
