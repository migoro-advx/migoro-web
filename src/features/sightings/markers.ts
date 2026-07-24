// Presentation + clustering helpers for sightings markers. Pure DOM builders
// (no framework) so SightingsMarkers can hand raw elements to MapTiler's
// `Marker`. Imported only from the client-only marker layer.
import type { Map } from '@maptiler/sdk'

import { COLORS } from '#/brand'
import type { BloomStage, LngLat, Sighting } from '#/lib/api'

/**
 * Bloom-stage -> marker color. Palette derived from the mockups (green healthy
 * blooms, orange early bloom). Tune here rather than inlining hex values.
 */
export const BLOOM_STAGE_COLOR: Record<BloomStage, string> = {
  含苞: '#c4d3b6',
  初开: '#e8865a',
  五成: '#a9bd86',
  满开: '#7c9a6d',
  凋落: '#b7a894',
}

const CLUSTER_COLOR = COLORS.sage

/** Points within this pixel distance (at the current zoom) merge into one cluster. */
const CLUSTER_PIXEL_RADIUS = 44

export interface Cluster {
  /** Stable key across a recompute, for React/marker diffing. */
  key: string
  /** Representative coordinate (first member) the marker anchors to. */
  coords: LngLat
  items: Sighting[]
}

/**
 * Greedy pixel-space clustering: project each sighting to screen pixels at the
 * current zoom and merge any that fall within CLUSTER_PIXEL_RADIUS of an
 * existing cluster's anchor. Cheap and good enough for a single region.
 */
export function clusterByPixel(map: Map, sightings: Sighting[]): Cluster[] {
  const clusters: Array<{ x: number; y: number; c: Cluster }> = []
  for (const s of sightings) {
    const p = map.project(s.coords)
    let placed = false
    for (const cluster of clusters) {
      const dx = p.x - cluster.x
      const dy = p.y - cluster.y
      if (dx * dx + dy * dy <= CLUSTER_PIXEL_RADIUS * CLUSTER_PIXEL_RADIUS) {
        cluster.c.items.push(s)
        placed = true
        break
      }
    }
    if (!placed) {
      clusters.push({ x: p.x, y: p.y, c: { key: s.id, coords: s.coords, items: [s] } })
    }
  }
  return clusters.map(c => c.c)
}

function colorFor(sighting: Sighting): string {
  return BLOOM_STAGE_COLOR[sighting.bloomStage]
}

/** A small round bloom-stage dot with a white ring. */
export function buildDotEl(sighting: Sighting): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = [
    'width:16px',
    'height:16px',
    'border-radius:9999px',
    `background:${colorFor(sighting)}`,
    'border:2px solid #fff',
    'box-shadow:0 1px 4px rgba(0,0,0,.25)',
    'cursor:pointer',
  ].join(';')
  return el
}

/** A circular photo thumbnail marker; falls back to the bloom color if the image fails. */
export function buildPhotoEl(sighting: Sighting): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = [
    'width:44px',
    'height:44px',
    'border-radius:9999px',
    `background:${colorFor(sighting)}`,
    'border:3px solid #fff',
    'box-shadow:0 2px 8px rgba(0,0,0,.3)',
    'overflow:hidden',
    'cursor:pointer',
  ].join(';')
  if (sighting.thumbnailUrl) {
    const img = document.createElement('img')
    img.src = sighting.thumbnailUrl
    img.alt = ''
    img.loading = 'lazy'
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block'
    img.onerror = () => img.remove()
    el.appendChild(img)
  }
  return el
}

/** A green count bubble for a multi-point cluster. */
export function buildClusterEl(count: number): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = [
    'min-width:34px',
    'height:34px',
    'padding:0 8px',
    'border-radius:9999px',
    `background:${CLUSTER_COLOR}`,
    'border:2px solid #fff',
    'box-shadow:0 2px 8px rgba(0,0,0,.3)',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'color:#fff',
    'font-size:13px',
    'font-weight:600',
    'cursor:pointer',
  ].join(';')
  el.textContent = String(count)
  return el
}
