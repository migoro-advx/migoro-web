// Geographic helpers over MapTiler / MapLibre LngLat ([lng, lat], WGS84).

import type { LngLat } from '#/lib/api'

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Great-circle distance in kilometres between two LngLat points (haversine). */
export function distanceKm(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Centre of a [west, south, east, north] bbox as LngLat. */
export function bboxCenter(bbox: [number, number, number, number]): LngLat {
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
}
