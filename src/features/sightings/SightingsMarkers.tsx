// Client-only sightings marker layer. Mounts inside <MapTilerMap> (so it can
// read the live map from context) and imperatively syncs MapTiler `Marker`
// instances to the current (species, day) sightings. Clusters are recomputed in
// pixel space on every pan/zoom, so overlapping points collapse into a count
// bubble like the mockup's "12".
import { useEffect } from 'react'
import { Marker } from '@maptiler/sdk'
import { useSetAtom } from 'jotai'

import { useMapInstance } from '#/components/MapTilerMap'
import { activePlaceIdAtom } from '#/features/places/state'
import { buildClusterEl, buildDotEl, buildPhotoEl, clusterByPixel } from './markers'
import { useSightings } from './useSightings'

export default function SightingsMarkers() {
  const map = useMapInstance()
  const { sightings } = useSightings()
  const setActivePlace = useSetAtom(activePlaceIdAtom)

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
        // A cluster shares one place; tapping any marker opens that place panel.
        const placeId = cluster.items[0].placeId
        if (placeId) {
          el.addEventListener('click', event => {
            event.stopPropagation()
            setActivePlace(placeId)
          })
        }
        markers.push(new Marker({ element: el }).setLngLat(cluster.coords).addTo(map))
      }
    }

    render()
    map.on('moveend', render)
    map.on('zoomend', render)
    // Tapping the map background (not a marker) dismisses any open place panel.
    const closePanel = () => setActivePlace(null)
    map.on('click', closePanel)

    return () => {
      map.off('moveend', render)
      map.off('zoomend', render)
      map.off('click', closePanel)
      for (const m of markers) m.remove()
      markers = []
    }
  }, [map, sightings, setActivePlace])

  return null
}
