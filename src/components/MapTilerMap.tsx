import { useEffect, useRef } from 'react'
import { GeolocateControl, Language, Map, MapStyle, config } from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'

config.apiKey = import.meta.env.VITE_MAPTILER_API_KEY

const LOCATE_ZOOM = 15

function getUserPosition(): Promise<GeolocationPosition | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null)
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      position => resolve(position),
      error => {
        console.warn('Geolocation failed:', error.message)
        resolve(null)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })
}

export default function MapTilerMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    let cancelled = false
    const container = containerRef.current

    // Resolve the user's location first, then open the map already centered
    // there so the initial view IS the current location (no fly-in). Falls
    // back to MapTiler defaults if location is denied or unavailable.
    void getUserPosition().then(position => {
      if (cancelled) return

      const map = new Map({
        container,
        style: MapStyle.STREETS,
        language: Language.SIMPLIFIED_CHINESE,
        geolocateControl: false,
        ...(position
          ? {
              center: [position.coords.longitude, position.coords.latitude] as [number, number],
              zoom: LOCATE_ZOOM,
            }
          : {}),
      })
      mapRef.current = map

      // Keep a locate control for the accuracy dot and on-demand
      // re-centering. animate:false makes it snap (never fly); the larger
      // maximumAge reuses the fix acquired above instead of re-querying.
      const geolocate = new GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        },
        fitBoundsOptions: { maxZoom: LOCATE_ZOOM, animate: false },
        trackUserLocation: false,
        showUserLocation: true,
        showAccuracyCircle: true,
      })
      map.addControl(geolocate)
      geolocate.on('error', e => console.warn('Geolocation failed:', e?.message ?? e))
      if (position) map.on('load', () => geolocate.trigger())
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="h-full w-full" />
}
