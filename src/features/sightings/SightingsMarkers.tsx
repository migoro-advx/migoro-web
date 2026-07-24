// Client-only sightings marker layer. Mounts inside <MapTilerMap> (so it can
// read the live map from context) and imperatively syncs MapTiler `Marker`
// instances to the current (species, day) sightings. Clusters are recomputed in
// pixel space on every pan/zoom, so overlapping points collapse into a count
// bubble like the mockup's "12".
import { useEffect } from 'react'
import { Marker } from '@maptiler/sdk'

import { useMapInstance } from '#/components/MapTilerMap'
import { buildClusterEl, buildDotEl, buildPhotoEl, clusterByPixel } from './markers'
import { useSightings } from './useSightings'

export default function SightingsMarkers() {
  const map = useMapInstance()
  const { sightings } = useSightings()

  useEffect(() => {
    if (!map) return

    let markers: Marker[] = []

    const render = () => {
      for (const m of markers) m.remove()
      markers = []
      for (const cluster of clusterByPixel(map, sightings)) {
        let el: HTMLElement
        if (cluster.items.length > 1) {
          el = buildClusterEl(cluster.items.length)
        } else {
          const item = cluster.items[0]
          el = item.thumbnailUrl ? buildPhotoEl(item) : buildDotEl(item)
        }
        markers.push(new Marker({ element: el }).setLngLat(cluster.coords).addTo(map))
      }
    }

    render()
    map.on('moveend', render)
    map.on('zoomend', render)

    return () => {
      map.off('moveend', render)
      map.off('zoomend', render)
      for (const m of markers) m.remove()
      markers = []
    }
  }, [map, sightings])

  return null
}
