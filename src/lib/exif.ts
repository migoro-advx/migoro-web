// EXIF extraction for album uploads. Reads capture time and GPS via exifr and
// normalizes coordinates to MapTiler / MapLibre LngLat ([lng, lat], WGS84).
//
// Per the product spec, album images without a capture time are non-compliant
// and must be rejected before entering the flow — callers should treat a null
// `capturedAt` as a hard stop.
import exifr from 'exifr'

import type { LngLat } from '#/lib/api'

export interface CaptureExif {
  /** ISO 8601 capture time from EXIF DateTimeOriginal, or null if absent. */
  capturedAt: string | null
  /** GPS as [lng, lat] (WGS84), or null if absent. */
  coords: LngLat | null
}

export async function readCaptureMeta(file: File): Promise<CaptureExif> {
  let capturedAt: string | null = null
  let coords: LngLat | null = null

  try {
    // `gps: true` asks exifr to parse the GPS block into { latitude, longitude }.
    const data = await exifr.parse(file, { gps: true })

    const original = data?.DateTimeOriginal ?? data?.CreateDate
    if (original instanceof Date && !Number.isNaN(original.getTime())) {
      capturedAt = original.toISOString()
    }

    const { latitude, longitude } = data ?? {}
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      // exifr yields { latitude, longitude }; store as [lng, lat].
      coords = [longitude, latitude]
    }
  } catch (error) {
    console.warn('EXIF parse failed:', error)
  }

  return { capturedAt, coords }
}
