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
  /**
   * Model confidence in [0, 1]. Optional — the real recognition endpoint does
   * not return a score, and no UI surfaces it; the mock still provides one.
   */
  confidence?: number
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
  /** Place this sighting belongs to; lets a marker click open the place panel. */
  placeId?: string
}

/**
 * A named place (地点) that aggregates sightings — e.g. a park entrance area.
 * `coords` is the place's anchor; individual posts share it (with a tiny map
 * jitter) so a place reads as one marker/cluster.
 */
export interface Place {
  id: string
  /** Park / venue name, e.g. "梧桐公园". */
  parkName: string
  /** Finer-grained area within the park, e.g. "湖畔入口". */
  areaName: string
  coords: LngLat
  /** Sensitive area — the UI shows only an approximate-location note. */
  sensitive?: boolean
}

/** How a post's capture time was obtained; surfaced as a trust signal. */
export type TimeSource = 'onsite' | 'album'

/** Backend post lifecycle status (PostVO.status). */
export type PostStatus = 'PUBLISHED' | 'HIDDEN' | 'DELETED'

/** zh-CN display text for each post status. */
export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  PUBLISHED: '已发布',
  HIDDEN: '已隐藏',
  DELETED: '已删除',
}

/**
 * A published sighting (帖子) with the richer fields the waterfall and detail
 * pages need. A `Sighting` is the map projection of a `Post`.
 */
export interface Post {
  id: string
  placeId: string
  speciesId: string
  bloomStage: BloomStage
  /** ISO 8601 capture time. */
  capturedAt: string
  /** ISO 8601 publish time. */
  publishedAt: string
  timeSource: TimeSource
  /** Absolute URL of the post's photo, when the backend has one. */
  imageUrl?: string
  /** Author's Clerk user id — the detail page's 编辑 visibility check. */
  authorId?: string
  /** Lifecycle status; only surfaced on the profile page's own posts. */
  status?: PostStatus
  /** Raw 具体点位 short name from the backend, e.g. "梧桐公园 · 湖畔入口". */
  locationName?: string
}

/**
 * Query shared by the place panel and the waterfall — always place + day
 * scoped, optionally narrowed to a single species. `bbox` resolves the seeded
 * world's anchor when the panel/route is hit before the map has an anchor.
 */
export interface PlacePostsQuery {
  placeId: string
  /** Selected day (local calendar day, YYYY-MM-DD). */
  date: string
  speciesId?: string
  bbox?: [number, number, number, number]
}

/** Aggregated view of a place for the half-screen panel. */
export interface PlaceSummary {
  place: Place
  /** Representative species/stage/date for the panel headline. */
  headline: { species: Species; bloomStage: BloomStage; capturedAt: string }
  /** Recent posts (that day, species-filtered) for the thumbnail row. */
  recentPosts: Post[]
  /** Total matching posts, for the "查看更多实况" affordance. */
  count: number
}

/** A post with its place and species resolved, for the detail page. */
export type PostDetail = Post & { place: Place; species: Species }

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
  /** Aggregated place view for the half-screen panel. Mock-only (no backend endpoint yet). */
  getPlaceSummary: (params: PlacePostsQuery) => Promise<PlaceSummary>
  /** Posts at a place, sorted by capture time desc, for the waterfall. Mock-only. */
  listPlacePosts: (params: PlacePostsQuery) => Promise<Post[]>
  /** Single post detail by id, with place + species resolved. Mock-only. */
  getPost: (postId: string) => Promise<PostDetail>
  /** All of the current user's posts (any status), newest first. Auth required. */
  listMyPosts: (userId: string) => Promise<Post[]>
}
