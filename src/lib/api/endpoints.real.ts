// Real backend implementation of the full `Api` surface (see ./index.ts).
//
// The backend has no "place" concept: a post carries only a `locationName` plus
// Web Mercator coordinates. We synthesize a stable `Place` per distinct
// `locationName` so the map -> panel -> waterfall -> detail flow keeps working
// against real data. Coordinates cross the boundary here: WGS84 LngLat in the
// app, EPSG:3857 metres on the wire.
import { bboxToMercator, lngLatToMercator, mercatorToLngLat } from '#/lib/geo'
import { request } from './client'
import { BLOOM_STAGES } from './types'
import type {
  Api,
  BloomStage,
  CreatePostPayload,
  CreatePostResult,
  Place,
  PlacePostsQuery,
  PlaceSummary,
  Post,
  PostDetail,
  RecognitionCandidate,
  Sighting,
  SightingsQuery,
  Species,
} from './types'

// --- Backend response shapes (as documented in the OpenAPI spec) ------------

/** `SpeciesVO` from `GET /api/species`. */
interface SpeciesVO {
  id: string
  /** 中文标准名. */
  standardName?: string
  /** 拉丁学名. */
  scientificName?: string
  /** Whether the species is in its viewing season (computed for the current month). */
  inSeason?: boolean
  /** Display period text, e.g. "3-4月". */
  bloomDisplay?: string
}

/** `RecognitionItemVO` from `POST /api/species/recognize`. */
interface RecognitionItemVO {
  /** Model-recognized name (ranked high to low). */
  name?: string
  /** The catalogued species this maps to, or null when not in the catalog. */
  matched?: { id: string; name: string } | null
}

/** `PostVO` from the `/api/posts` family. */
interface PostVO {
  id: string
  authorId?: string
  speciesId: string
  speciesName?: string
  imageId?: string
  imageUrl?: string
  /** 观赏状态码. */
  stage?: string
  /** 观赏状态中文名. */
  stageLabel?: string
  /** Web Mercator X (metres, EPSG:3857). */
  mercatorX: number
  /** Web Mercator Y (metres, EPSG:3857). */
  mercatorY: number
  locationName?: string
  capturedAt: string
  publishedAt?: string
  status?: string
}

// --- Species mapping (unchanged from the original real implementation) ------

function toSpecies(vo: SpeciesVO): Species {
  return {
    id: vo.id,
    scientificName: vo.scientificName ?? '',
    commonName: vo.standardName ?? '',
    inSeason: vo.inSeason,
    // Backend controls the period text; no "花期 " prefix is reintroduced.
    periodLabel: vo.bloomDisplay,
    // accentColor is a presentation-only hint the backend does not provide;
    // SpeciesQuery falls back to FALLBACK_ACCENT when it is absent.
  }
}

// --- Place synthesis + shared conversions -----------------------------------

/** FNV-1a hash of the trimmed location name -> a stable synthetic place id. */
function placeIdFromLocation(name: string): string {
  const s = name.trim()
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `loc-${(h >>> 0).toString(16)}`
}

/**
 * Bloom stage from a PostVO. The backend `stage` enum is undocumented, so we
 * key off the zh `stageLabel` (or `stage`) and fall back to 满开. Centralized
 * here alongside `stageToCode` so a code change is a one-line fix.
 */
function stageFromVO(vo: PostVO): BloomStage {
  const label = vo.stageLabel ?? vo.stage
  if (label && (BLOOM_STAGES as readonly string[]).includes(label)) {
    return label as BloomStage
  }
  return '满开'
}

/** Bloom stage -> the `stage` code sent on publish. We send the zh label. */
function stageToCode(stage: BloomStage): string {
  return stage
}

/** A synthetic Place for a post, keyed by its locationName. */
function synthPlace(vo: PostVO): Place {
  const name = vo.locationName ?? ''
  return {
    id: placeIdFromLocation(name),
    parkName: name,
    areaName: '',
    coords: mercatorToLngLat([vo.mercatorX, vo.mercatorY]),
  }
}

/** Minimal Species from a post — consumers only read `commonName`. */
function speciesFromVO(vo: PostVO): Species {
  return { id: vo.speciesId, commonName: vo.speciesName ?? '', scientificName: '' }
}

function toPost(vo: PostVO): Post {
  return {
    id: vo.id,
    placeId: placeIdFromLocation(vo.locationName ?? ''),
    speciesId: vo.speciesId,
    bloomStage: stageFromVO(vo),
    capturedAt: vo.capturedAt,
    publishedAt: vo.publishedAt ?? vo.capturedAt,
    // The backend has no time-source field; default to on-site.
    timeSource: 'onsite',
  }
}

// --- Local calendar-day helpers ---------------------------------------------

/** Local calendar-day key (YYYY-MM-DD) for a Date. */
function localDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** True when the ISO instant falls on the given local calendar day. */
function dayMatches(iso: string, date: string): boolean {
  return localDayKey(new Date(iso)) === date
}

/** ISO instant bounds spanning the given local calendar day. */
function dayRange(date: string): { from: string; to: string } {
  const [y, m, d] = date.split('-').map(Number)
  const from = new Date(y, m - 1, d, 0, 0, 0, 0)
  const to = new Date(y, m - 1, d, 23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
}

/** Published posts on a local day, optionally narrowed to one species. */
async function fetchPostsForDay(date: string, speciesId?: string): Promise<PostVO[]> {
  const { from, to } = dayRange(date)
  const params = new URLSearchParams({ capturedFrom: from, capturedTo: to })
  if (speciesId) params.set('speciesId', speciesId)
  return request<PostVO[]>(`/api/posts?${params.toString()}`, { method: 'GET' })
}

// --- The full real API ------------------------------------------------------

export const realApi: Api = {
  async listSpecies(): Promise<Species[]> {
    const list = await request<SpeciesVO[]>('/api/species', { method: 'GET' })
    return list.map(toSpecies)
  },

  async recognizeSpecies(image: string): Promise<RecognitionCandidate[]> {
    // The capture is held as a data URL; the endpoint wants a multipart file.
    const blob = await (await fetch(image)).blob()
    const form = new FormData()
    form.append('file', blob, 'capture.jpg')

    const items = await request<RecognitionItemVO[]>('/api/species/recognize', {
      method: 'POST',
      body: form,
    })

    // Keep API order (ranked by likelihood). Drop items with no catalogued
    // match — recognized-but-not-catalogued is a scenario the UI does not
    // handle, so we surface only species the user can actually confirm.
    return items
      .filter((item): item is RecognitionItemVO & { matched: { id: string; name: string } } =>
        Boolean(item.matched),
      )
      .map(item => ({
        // RecognizeStep uses id/commonName; DetailStep re-resolves the full
        // record from listSpecies by id, so a minimal Species suffices here.
        species: { id: item.matched.id, commonName: item.matched.name, scientificName: '' },
      }))
  },

  async listSightings(params: SightingsQuery): Promise<Sighting[]> {
    // `/api/posts/within` requires all four mercator bounds; without a viewport
    // there is nothing to query (the map always has bounds once loaded).
    if (!params.bbox) return []
    const { minX, maxX, minY, maxY } = bboxToMercator(params.bbox)
    const query = new URLSearchParams({
      minX: String(minX),
      maxX: String(maxX),
      minY: String(minY),
      maxY: String(maxY),
    })
    const posts = await request<PostVO[]>(`/api/posts/within?${query.toString()}`, {
      method: 'GET',
    })

    // The endpoint filters by bbox only; narrow to the selected day + species.
    return posts
      .filter(vo => dayMatches(vo.capturedAt, params.date))
      .filter(vo => !params.speciesId || vo.speciesId === params.speciesId)
      .map(vo => ({
        id: vo.id,
        speciesId: vo.speciesId,
        coords: mercatorToLngLat([vo.mercatorX, vo.mercatorY]),
        bloomStage: stageFromVO(vo),
        capturedAt: vo.capturedAt,
        placeId: placeIdFromLocation(vo.locationName ?? ''),
      }))
  },

  async getPlaceSummary(params: PlacePostsQuery): Promise<PlaceSummary> {
    const all = await fetchPostsForDay(params.date, params.speciesId)
    const matched = all
      .filter(vo => placeIdFromLocation(vo.locationName ?? '') === params.placeId)
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))

    if (matched.length === 0) throw new Error(`No posts for place: ${params.placeId}`)

    // Headline species: the selected one, else the most-posted that day.
    let headlineSpeciesId = params.speciesId
    if (!headlineSpeciesId) {
      const counts = new Map<string, number>()
      for (const p of matched) counts.set(p.speciesId, (counts.get(p.speciesId) ?? 0) + 1)
      headlineSpeciesId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    }
    const headlinePost = matched.find(p => p.speciesId === headlineSpeciesId) ?? matched[0]

    return {
      place: synthPlace(headlinePost),
      headline: {
        species: speciesFromVO(headlinePost),
        bloomStage: stageFromVO(headlinePost),
        capturedAt: headlinePost.capturedAt,
      },
      recentPosts: matched.slice(0, 4).map(toPost),
      count: matched.length,
    }
  },

  async listPlacePosts(params: PlacePostsQuery): Promise<Post[]> {
    const all = await fetchPostsForDay(params.date, params.speciesId)
    return all
      .filter(vo => placeIdFromLocation(vo.locationName ?? '') === params.placeId)
      .map(toPost)
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
  },

  async getPost(postId: string): Promise<PostDetail> {
    const vo = await request<PostVO>(`/api/posts/${postId}`, { method: 'GET' })
    return { ...toPost(vo), place: synthPlace(vo), species: speciesFromVO(vo) }
  },

  async createPost(payload: CreatePostPayload): Promise<CreatePostResult> {
    if (!payload.location.coords) throw new Error('缺少拍摄位置，无法发布')
    if (!payload.speciesId) throw new Error('缺少物种，无法发布')
    if (!payload.bloomStage) throw new Error('缺少观赏状态，无法发布')

    const [mercatorX, mercatorY] = lngLatToMercator(payload.location.coords)
    const query = new URLSearchParams({
      speciesId: payload.speciesId,
      stage: stageToCode(payload.bloomStage),
      mercatorX: String(mercatorX),
      mercatorY: String(mercatorY),
      capturedAt: payload.capturedAt,
      locationName: payload.location.name,
    })

    // Multipart upload of the captured photo (held as a data URL). Posts have
    // no body field, so nothing else is sent in the request body.
    const blob = await (await fetch(payload.image)).blob()
    const form = new FormData()
    form.append('file', blob, 'capture.jpg')

    const vo = await request<PostVO>(`/api/posts?${query.toString()}`, {
      method: 'POST',
      body: form,
    })
    return { id: vo.id }
  },
}
