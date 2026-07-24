// Browser geolocation as MapTiler / MapLibre LngLat ([lng, lat], WGS84).
// Resolves null (never rejects) when unavailable or denied, so callers can fall
// back gracefully. Requires a secure context (localhost in dev, HTTPS in prod).
import type { LngLat } from '#/lib/api'

export function getCurrentLngLat(): Promise<LngLat | null> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return Promise.resolve(null)
  }
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      position => resolve([position.coords.longitude, position.coords.latitude]),
      error => {
        console.warn('Geolocation failed:', error.message)
        resolve(null)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  })
}
