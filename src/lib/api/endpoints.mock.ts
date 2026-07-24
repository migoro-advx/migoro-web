// Mock implementation used while the backend is unavailable. Shares the `Api`
// surface with endpoints.real.ts so callers never change. Replace by flipping
// VITE_USE_MOCK_API to false (see index.ts).
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
  TimeSource,
} from './types'

const MOCK_SPECIES: Species[] = [
  // 当前花期 (inSeason). Subtitle is always the period text — the design mock
  // showed 樱花 as "当前花期" instead of a period, which was inconsistent; the
  // in-season state is conveyed by the 当前花期 section, not the subtitle.
  {
    id: 'prunus-serrulata',
    scientificName: 'Prunus serrulata',
    commonName: '樱花',
    inSeason: true,
    periodLabel: '花期 3-4月',
    accentColor: '#f7d3bf',
  },
  {
    id: 'salvia-nemorosa',
    scientificName: 'Salvia nemorosa',
    commonName: '紫花鼠尾草',
    inSeason: true,
    periodLabel: '花期 6-8月',
    accentColor: '#DCECEF',
  },
  {
    id: 'hydrangea-macrophylla',
    scientificName: 'Hydrangea macrophylla',
    commonName: '绣球',
    inSeason: true,
    periodLabel: '花期 6-8月',
    accentColor: '#f6ddcb',
  },
  // 其他花卉
  {
    id: 'ginkgo-biloba',
    scientificName: 'Ginkgo biloba',
    commonName: '银杏',
    inSeason: false,
    periodLabel: '观叶期 10-11月',
    accentColor: '#aebf94',
  },
  {
    id: 'prunus-mume',
    scientificName: 'Prunus mume',
    commonName: '梅花',
    inSeason: false,
    periodLabel: '花期 1-3月',
    accentColor: '#f6d3c0',
  },
  {
    id: 'acer-palmatum',
    scientificName: 'Acer palmatum',
    commonName: '枫叶',
    inSeason: false,
    periodLabel: '观叶期 10-12月',
    accentColor: '#cfe0dd',
  },
]

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// --- Seeded world: fixed places + deterministic posts ---------------------
// A small set of Places is anchored near the user's initial map center; each
// place's posts are generated deterministically from (placeId, speciesId, date)
// so ids stay stable for a session and the panel / waterfall / detail pages all
// read one source of truth. `listSightings` is the map projection of these
// posts. Design-locked states are preserved: 紫花鼠尾草 today is busy and
// 紫花鼠尾草 5 天前 is empty. Falls back to 杭州西湖 before any map anchor exists.

// 杭州西湖 (West Lake), used as the anchor when no map viewport is available yet.
const HANGZHOU_CENTER: [number, number] = [120.1551, 30.2741]
const MS_PER_DAY = 86_400_000

/** FNV-1a string hash -> 32-bit unsigned int, for seeding the PRNG. */
function hashSeed(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32 — small, fast, deterministic PRNG in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Whole-day difference between the local `date` (YYYY-MM-DD) and today. */
function daysBackFromToday(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return -1
  const picked = new Date(y, m - 1, d).getTime()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((today - picked) / MS_PER_DAY)
}

/** Fixed place definitions (name/area/sensitivity independent of the anchor). */
interface PlaceDef {
  id: string
  parkName: string
  areaName: string
  sensitive?: boolean
}

const PLACE_DEFS: PlaceDef[] = [
  { id: 'place-wutong-lake', parkName: '梧桐公园', areaName: '湖畔入口' },
  { id: 'place-wutong-east', parkName: '梧桐公园', areaName: '东侧花带', sensitive: true },
  { id: 'place-yunxi-valley', parkName: '云溪谷', areaName: '樱花坡' },
  { id: 'place-binhe-greenway', parkName: '滨河绿道', areaName: '三号驿站' },
  { id: 'place-gushan-garden', parkName: '孤山植物园', areaName: '银杏道' },
]

/** Deterministic coordinate for the nth place, spread ~0.4–1.3km around the anchor. */
function placeCoords(anchor: [number, number], index: number): [number, number] {
  const rand = mulberry32(hashSeed(`place-offset:${index}`))
  const angle = rand() * Math.PI * 2
  const radius = 0.004 + rand() * 0.008
  return [anchor[0] + Math.cos(angle) * radius, anchor[1] + Math.sin(angle) * radius]
}

function anchorFromBbox(bbox?: [number, number, number, number]): [number, number] {
  if (!bbox) return HANGZHOU_CENTER
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
}

// Session singleton: built once from the first available anchor so place ids and
// coords stay put for the session. Deep-linking before the map exists rebuilds
// from the default anchor — best-effort, not persisted.
let world: { places: Place[] } | null = null

function getWorld(bbox?: [number, number, number, number]): { places: Place[] } {
  if (world) return world
  const anchor = anchorFromBbox(bbox)
  world = {
    places: PLACE_DEFS.map((def, i) => ({
      id: def.id,
      parkName: def.parkName,
      areaName: def.areaName,
      sensitive: def.sensitive,
      coords: placeCoords(anchor, i),
    })),
  }
  return world
}

function findPlace(placeId: string, bbox?: [number, number, number, number]): Place | undefined {
  return getWorld(bbox).places.find(p => p.id === placeId)
}

function withinBbox(coords: [number, number], bbox: [number, number, number, number]): boolean {
  const [w, s, e, n] = bbox
  return coords[0] >= w && coords[0] <= e && coords[1] >= s && coords[1] <= n
}

/** How many posts a (place, species, day) triple should have. */
function postCountFor(
  placeId: string,
  speciesId: string,
  daysBack: number,
  rand: () => number,
): number {
  // Design-locked demo: 紫花鼠尾草 busy today, empty 5 天前.
  if (speciesId === 'salvia-nemorosa') {
    if (daysBack === 0) return placeId === 'place-wutong-lake' ? 6 : 2 + Math.floor(rand() * 3)
    if (daysBack === 5) return 0
  }
  const r = rand()
  return r < 0.55 ? 0 : 1 + Math.floor(r * 4)
}

/**
 * Deterministic posts for a place on a given day, across all species, sorted by
 * capture time descending (newest first) — the waterfall order.
 */
function buildPostsForPlaceDay(placeId: string, date: string): Post[] {
  const daysBack = daysBackFromToday(date)
  if (daysBack < 0) return []

  const [y, m, d] = date.split('-').map(Number)
  const posts: Post[] = []
  for (const sp of MOCK_SPECIES) {
    const rand = mulberry32(hashSeed(`posts:${placeId}:${sp.id}:${date}`))
    const count = postCountFor(placeId, sp.id, daysBack, rand)
    for (let i = 0; i < count; i++) {
      const hour = 7 + Math.floor(rand() * 11) // 07:00–17:59
      const minute = Math.floor(rand() * 60)
      const captured = new Date(y, m - 1, d, hour, minute)
      const published = new Date(captured.getTime() + (5 + Math.floor(rand() * 120)) * 60_000)
      const stage: BloomStage = BLOOM_STAGES[Math.floor(rand() * BLOOM_STAGES.length)]
      const timeSource: TimeSource = rand() < 0.75 ? 'onsite' : 'album'
      posts.push({
        id: `${placeId}__${date}__${sp.id}__${i}`,
        placeId,
        speciesId: sp.id,
        bloomStage: stage,
        capturedAt: captured.toISOString(),
        publishedAt: published.toISOString(),
        timeSource,
      })
    }
  }
  posts.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
  return posts
}

/** Map projection of the world's posts for (species, day), filtered to the viewport. */
function buildSightings(params: SightingsQuery): Sighting[] {
  const { speciesId, date, bbox } = params
  if (daysBackFromToday(date) < 0) return []

  const sightings: Sighting[] = []
  for (const place of getWorld(bbox).places) {
    if (bbox && !withinBbox(place.coords, bbox)) continue
    const posts = buildPostsForPlaceDay(place.id, date)
    const matched = speciesId ? posts.filter(p => p.speciesId === speciesId) : posts
    for (const post of matched) {
      // Tiny deterministic jitter so a place reads as one pixel cluster.
      const jr = mulberry32(hashSeed(`jit:${post.id}`))
      const coords: [number, number] = [
        place.coords[0] + (jr() - 0.5) * 0.0006,
        place.coords[1] + (jr() - 0.5) * 0.0006,
      ]
      sightings.push({
        id: post.id,
        speciesId: post.speciesId,
        coords,
        bloomStage: post.bloomStage,
        capturedAt: post.capturedAt,
        placeId: place.id,
        // Keep the map's photo-bubble path alive for occasional standalone points.
        ...(jr() < 0.35 ? { thumbnailUrl: `https://picsum.photos/seed/${post.id}/96` } : {}),
      })
    }
  }
  return sightings
}

/** Build a PlaceSummary for the panel from (place, day, species) posts. */
function buildPlaceSummary(params: PlacePostsQuery): PlaceSummary {
  const { placeId, date, speciesId, bbox } = params
  const place = findPlace(placeId, bbox)
  if (!place) throw new Error(`Unknown place: ${placeId}`)

  const all = buildPostsForPlaceDay(placeId, date)
  const matched = speciesId ? all.filter(p => p.speciesId === speciesId) : all

  // Headline species: the selected one, else the most-posted species that day.
  let headlineSpeciesId = speciesId
  if (!headlineSpeciesId) {
    const counts = new Map<string, number>()
    for (const p of matched) counts.set(p.speciesId, (counts.get(p.speciesId) ?? 0) + 1)
    headlineSpeciesId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  }
  const headlinePost = headlineSpeciesId
    ? matched.find(p => p.speciesId === headlineSpeciesId)
    : matched[0]
  const species =
    MOCK_SPECIES.find(s => s.id === (headlinePost?.speciesId ?? headlineSpeciesId)) ??
    MOCK_SPECIES[0]

  return {
    place,
    headline: {
      species,
      bloomStage: headlinePost?.bloomStage ?? '满开',
      capturedAt: headlinePost?.capturedAt ?? new Date(`${date}T09:00:00`).toISOString(),
    },
    recentPosts: matched.slice(0, 4),
    count: matched.length,
  }
}

export const mockApi: Api = {
  async recognizeSpecies(_image: string): Promise<RecognitionCandidate[]> {
    await delay(900)
    return [
      { species: MOCK_SPECIES[0], confidence: 0.87 },
      { species: MOCK_SPECIES[2], confidence: 0.64 },
      { species: MOCK_SPECIES[3], confidence: 0.41 },
    ]
  },

  async createPost(_payload: CreatePostPayload): Promise<CreatePostResult> {
    await delay(700)
    return { id: `mock-${Date.now()}` }
  },

  async listSpecies(): Promise<Species[]> {
    await delay(300)
    return MOCK_SPECIES
  },

  async listSightings(params: SightingsQuery): Promise<Sighting[]> {
    await delay(400)
    return buildSightings(params)
  },

  async getPlaceSummary(params: PlacePostsQuery): Promise<PlaceSummary> {
    await delay(300)
    return buildPlaceSummary(params)
  },

  async listPlacePosts(params: PlacePostsQuery): Promise<Post[]> {
    await delay(350)
    getWorld(params.bbox) // ensure the world exists for a deep-linked route
    const posts = buildPostsForPlaceDay(params.placeId, params.date)
    return params.speciesId ? posts.filter(p => p.speciesId === params.speciesId) : posts
  },

  async getPost(postId: string): Promise<PostDetail> {
    await delay(300)
    const [placeId, date] = postId.split('__')
    if (!placeId || !date) throw new Error(`Malformed post id: ${postId}`)
    const post = buildPostsForPlaceDay(placeId, date).find(p => p.id === postId)
    const place = findPlace(placeId)
    const species = MOCK_SPECIES.find(s => s.id === post?.speciesId)
    if (!post || !place || !species) throw new Error(`Post not found: ${postId}`)
    return { ...post, place, species }
  },
}
