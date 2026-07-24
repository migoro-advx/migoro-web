// Domain types shared by the API layer and the app.
//
// Coordinates are always MapTiler / MapLibre `LngLat`: `[longitude, latitude]`
// in WGS84 (EPSG:4326). Normalize any incoming coordinate (geolocation, EXIF)
// to this shape at the boundary and keep it all the way to the backend.
export type LngLat = [number, number]

export interface Species {
  id: string
  /** Latin / scientific name, e.g. "Prunus serrulata". */
  scientificName: string
  /** Display name in Simplified Chinese, e.g. "樱花". */
  commonName: string
  /**
   * Whether the species is currently in its viewing season. Backend/ops driven;
   * used to group the species-query page into 当前花期 / 其他花卉. Optional so
   * other Species consumers (e.g. recognition candidates) can omit it.
   */
  inSeason?: boolean
  /** Display-ready period text, e.g. "花期 6-8月" / "观叶期 10-11月". */
  periodLabel?: string
  /** Placeholder accent color for the card image (presentation hint only). */
  accentColor?: string
}

/** Bloom / defoliation stage. Kept as open-ended zh-CN labels for now. */
export type BloomStage = '含苞' | '初开' | '五成' | '满开' | '凋落'

export const BLOOM_STAGES: readonly BloomStage[] = ['含苞', '初开', '五成', '满开', '凋落']

/** How a coordinate was obtained, surfaced so the user can confirm/correct it. */
export type CoordsSource = 'geolocation' | 'exif' | 'none'

export type CaptureSource = 'camera' | 'album'

export interface CaptureMeta {
  source: CaptureSource
  /** ISO 8601 capture time. From `now` for camera, from EXIF for album. */
  capturedAt: string
  coords: LngLat | null
  coordsSource: CoordsSource
}

export interface RecognitionCandidate {
  species: Species
  /** Model confidence in [0, 1]. */
  confidence: number
}

export interface CreatePostPayload {
  /** Captured image as a data URL for now; will become an upload ref later. */
  image: string
  capturedAt: string
  speciesId: string | null
  bloomStage: BloomStage | null
  location: {
    name: string
    coords: LngLat | null
  }
  description: string
}

export interface CreatePostResult {
  id: string
}

/**
 * A single field sighting (实况) — one person's observation of a species at a
 * place and time. This is what the map plots and the TimeDial counts.
 */
export interface Sighting {
  id: string
  speciesId: string
  coords: LngLat
  bloomStage: BloomStage
  /** ISO 8601 observation time. */
  capturedAt: string
  /** Optional photo for a thumbnail marker; absent renders a plain dot. */
  thumbnailUrl?: string
  /** Optional finer-grained area within the place, e.g. "湖畔入口 · 东侧花带". */
  areaName?: string
}

/**
 * Query for sightings shown on the map. `date` is the selected day (local
 * calendar day, YYYY-MM-DD). `bbox` is the current map viewport as
 * [west, south, east, north]; a real backend filters spatially by it.
 */
export interface SightingsQuery {
  speciesId?: string
  date: string
  bbox?: [number, number, number, number]
}

/** The stable surface every implementation (mock or real) must satisfy. */
export interface Api {
  recognizeSpecies: (image: string) => Promise<RecognitionCandidate[]>
  createPost: (payload: CreatePostPayload) => Promise<CreatePostResult>
  listSpecies: () => Promise<Species[]>
  listSightings: (params: SightingsQuery) => Promise<Sighting[]>
}
