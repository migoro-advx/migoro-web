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
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Centre of a [west, south, east, north] bbox as LngLat. */
export function bboxCenter(bbox: [number, number, number, number]): LngLat {
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
}

// --- Web Mercator (EPSG:3857) <-> WGS84 -----------------------------------
// The backend stores coordinates as Web Mercator metres (mercatorX/mercatorY);
// the app works in WGS84 LngLat. Convert at the API boundary only.

/** Half the equatorial circumference in metres — the mercator axis extent. */
const MERCATOR_R = 20037508.34

/** WGS84 [lng, lat] -> Web Mercator [x, y] in metres. */
export function lngLatToMercator([lng, lat]: LngLat): [number, number] {
  const x = (lng * MERCATOR_R) / 180
  const y =
    (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180)) * (MERCATOR_R / 180)
  return [x, y]
}

/** Web Mercator [x, y] in metres -> WGS84 [lng, lat]. */
export function mercatorToLngLat([x, y]: [number, number]): LngLat {
  const lng = (x / MERCATOR_R) * 180
  const lat = (Math.atan(Math.exp((y / MERCATOR_R) * Math.PI)) * 360) / Math.PI - 90
  return [lng, lat]
}

/** [west, south, east, north] WGS84 bbox -> mercator metre bounds for `/within`. */
export function bboxToMercator(bbox: [number, number, number, number]): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} {
  const [minX, minY] = lngLatToMercator([bbox[0], bbox[1]])
  const [maxX, maxY] = lngLatToMercator([bbox[2], bbox[3]])
  return { minX, maxX, minY, maxY }
}
