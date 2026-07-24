// Draggable location picker map for the "确认拍摄位置" step. Mirrors the
// MapTilerMap conventions: client-only (the SDK touches window/WebGL at import,
// so this module must never be imported during SSR — LocationStep loads it via
// lazy()), an explicit MapStyle, zh-Hans labels, and an `h-full w-full`
// container (percentage sizing; the SDK forces position:relative).
//
// The map itself has no marker; a DOM pin is overlaid dead-center so "the point"
// is always the map center. Dragging the map moves the center under the pin and
// reports the new coordinate on `moveend`.
import { useEffect, useRef } from 'react'
import { Map, MapStyle, Language, config } from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'

import type { LngLat } from '#/lib/api'

config.apiKey = import.meta.env.VITE_MAPTILER_API_KEY

const LOCATE_ZOOM = 15

export default function LocationPickerMap({
  center,
  onCenterChange,
}: {
  center: LngLat | null
  onCenterChange: (coords: LngLat) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  // Keep the latest callback in a ref so the init effect runs only once.
  const onCenterChangeRef = useRef(onCenterChange)
  onCenterChangeRef.current = onCenterChange
  // Initial center is read once at construction; later prop changes don't recenter.
  const initialCenterRef = useRef(center)

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    const map = new Map({
      container: containerRef.current,
      style: MapStyle.STREETS,
      language: Language.SIMPLIFIED_CHINESE,
      geolocateControl: false,
      ...(initialCenterRef.current
        ? { center: initialCenterRef.current, zoom: LOCATE_ZOOM }
        : {}),
    })
    mapRef.current = map

    // Only report user-driven moves (drag / zoom). Programmatic moves and the
    // initial viewport settle have no `originalEvent`, so we skip them —
    // otherwise the map's arbitrary default center (when no initial center is
    // provided) would be written into the form before any interaction.
    map.on('moveend', e => {
      if (!e.originalEvent) return
      const c = map.getCenter()
      onCenterChangeRef.current([c.lng, c.lat])
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {/* Center pin overlay — always marks the map center. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="h-4 w-4 rounded-full bg-orange-500 ring-4 ring-white" aria-hidden />
      </div>
    </div>
  )
}
