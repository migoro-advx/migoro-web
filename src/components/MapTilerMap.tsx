import { useEffect, useRef } from 'react'
import { Language, Map, MapStyle, config } from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'

config.apiKey = import.meta.env.VITE_MAPTILER_API_KEY

export default function MapTilerMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    mapRef.current = new Map({
      container: containerRef.current,
      style: MapStyle.STREETS,
      language: Language.SIMPLIFIED_CHINESE,
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="h-full w-full" />
}
