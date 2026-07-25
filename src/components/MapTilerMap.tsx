import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { GeolocateControl, Language, Map, MapStyle, config } from '@maptiler/sdk'
import { useSetAtom } from 'jotai'
import '@maptiler/sdk/dist/maptiler-sdk.css'

import { mapBoundsAtom, placeNameAtom } from '#/features/sightings/state'
import { reverseGeocode } from '#/lib/geocoding'

config.apiKey = import.meta.env.VITE_MAPTILER_API_KEY

const LOCATE_ZOOM = 15

/**
 * Fallback map center (杭州西湖 / West Lake) used when geolocation is denied or
 * unavailable. Kept in sync with the mock world's fallback anchor so the seeded
 * sightings are in view even without a real location fix.
 */
const HANGZHOU_CENTER: [number, number] = [120.1551, 30.2741]
const HANGZHOU_ZOOM = 12

/**
 * The live MapTiler `Map`, shared with client-only children (e.g. the sightings
 * marker layer). `null` until the map has loaded.
 */
const MapContext = createContext<Map | null>(null)

export function useMapInstance(): Map | null {
  return useContext(MapContext)
}

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

export default function MapTilerMap({
  children,
  controlsBottomOffset,
}: {
  children?: ReactNode
  /**
   * Lifts the bottom-right control corner (zoom / compass / locate) above
   * bottom-anchored UI such as the TimeDial dome. Any CSS length; applied via
   * the `--map-ctrl-bottom` variable (see styles.css).
   */
  controlsBottomOffset?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const [map, setMap] = useState<Map | null>(null)
  const setPlaceName = useSetAtom(placeNameAtom)
  const setMapBounds = useSetAtom(mapBoundsAtom)

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    let cancelled = false
    const container = containerRef.current

    // Reverse-geocode the map center to a district-level label for the 定位胶囊.
    // A monotonic sequence discards out-of-order responses so rapid panning
    // never leaves a stale place name.
    let geocodeSeq = 0
    const updatePlaceName = (m: Map) => {
      const seq = ++geocodeSeq
      const c = m.getCenter()
      void reverseGeocode([c.lng, c.lat]).then(name => {
        if (!cancelled && seq === geocodeSeq && name) {
          setPlaceName(name.split(/[,，]/)[0]?.trim() ?? name)
        }
      })
    }

    // Publish the current viewport so sightings are queried within view.
    const updateBounds = (m: Map) => {
      if (cancelled) return
      const b = m.getBounds()
      setMapBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
    }

    // Resolve the user's location first, then open the map already centered
    // there so the initial view IS the current location (no fly-in). Falls
    // back to MapTiler defaults if location is denied or unavailable.
    void getUserPosition().then(position => {
      if (cancelled) return

      const mapInstance = new Map({
        container,
        style: MapStyle.STREETS,
        language: Language.SIMPLIFIED_CHINESE,
        navigationControl: 'bottom-right',
        geolocateControl: false,
        ...(position
          ? {
              center: [position.coords.longitude, position.coords.latitude] as [number, number],
              zoom: LOCATE_ZOOM,
            }
          : { center: HANGZHOU_CENTER, zoom: HANGZHOU_ZOOM }),
      })
      mapRef.current = mapInstance

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
      mapInstance.addControl(geolocate, 'bottom-right')
      geolocate.on('error', e => console.warn('Geolocation failed:', e?.message ?? e))
      mapInstance.on('load', () => {
        if (cancelled) return
        if (position) geolocate.trigger()
        setMap(mapInstance)
        updatePlaceName(mapInstance)
        updateBounds(mapInstance)
      })
      mapInstance.on('moveend', () => {
        updatePlaceName(mapInstance)
        updateBounds(mapInstance)
      })
    })

    return () => {
      cancelled = true
      setMap(null)
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [setPlaceName, setMapBounds])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={
        controlsBottomOffset
          ? ({ '--map-ctrl-bottom': controlsBottomOffset } as CSSProperties)
          : undefined
      }
    >
      <MapContext.Provider value={map}>{children}</MapContext.Provider>
    </div>
  )
}
