// Mock implementation used while the backend is unavailable. Shares the `Api`
// surface with endpoints.real.ts so callers never change. Replace by flipping
// VITE_USE_MOCK_API to false (see index.ts).
import { BLOOM_STAGES } from './types'
import type {
  Api,
  CreatePostPayload,
  CreatePostResult,
  RecognitionCandidate,
  Sighting,
  SightingsQuery,
  Species,
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
    accentColor: '#f6d0bd',
  },
  {
    id: 'salvia-nemorosa',
    scientificName: 'Salvia nemorosa',
    commonName: '紫花鼠尾草',
    inSeason: true,
    periodLabel: '花期 6-8月',
    accentColor: '#d6e2d3',
  },
  {
    id: 'hydrangea-macrophylla',
    scientificName: 'Hydrangea macrophylla',
    commonName: '绣球',
    inSeason: true,
    periodLabel: '花期 6-8月',
    accentColor: '#e4e2c6',
  },
  // 其他花卉
  {
    id: 'ginkgo-biloba',
    scientificName: 'Ginkgo biloba',
    commonName: '银杏',
    inSeason: false,
    periodLabel: '观叶期 10-11月',
    accentColor: '#eadfae',
  },
  {
    id: 'prunus-mume',
    scientificName: 'Prunus mume',
    commonName: '梅花',
    inSeason: false,
    periodLabel: '花期 1-3月',
    accentColor: '#f2cdd8',
  },
  {
    id: 'acer-palmatum',
    scientificName: 'Acer palmatum',
    commonName: '枫叶',
    inSeason: false,
    periodLabel: '观叶期 10-12月',
    accentColor: '#e6c1b3',
  },
]

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// --- Deterministic sightings mock -----------------------------------------
// Sightings are generated from a (speciesId, date) seed so the same query
// always yields the same map, and so the two design states are reproducible:
// 紫花鼠尾草 today -> 18 sightings (with a tight cluster + one photo), and
// 紫花鼠尾草 5 days ago -> empty. Everything is centered on 巴黎一区.

const PARIS_CENTER: [number, number] = [2.3388, 48.8606]
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

/** How many sightings a (species, day) pair should have. */
function sightingCount(speciesId: string | undefined, daysBack: number, rand: () => number): number {
  // Overview (no species filter): a light sample across the region.
  if (!speciesId) return 6
  // Design-locked states for the demo species.
  if (speciesId === 'salvia-nemorosa') {
    if (daysBack === 0) return 18
    if (daysBack === 5) return 0
  }
  // Otherwise a deterministic small set; some days land empty.
  const r = rand()
  return r < 0.2 ? 0 : 3 + Math.floor(r * 12)
}

function buildSightings(params: SightingsQuery): Sighting[] {
  const { speciesId, date, bbox } = params
  const daysBack = daysBackFromToday(date)

  // Count depends only on (species, day) so the design states hold everywhere:
  // 紫花鼠尾草 today -> 18, 5天前 -> 0, regardless of where the map is.
  const countRand = mulberry32(hashSeed(`count:${speciesId ?? 'all'}:${date}`))
  const count = sightingCount(speciesId, daysBack, countRand)
  if (count === 0) return []

  // Positions are scattered inside the current viewport (fallback: a small box
  // around Paris pre-load), seeded by (species, day, coarse bbox) so they stay
  // put per view but refresh when the user moves to a genuinely new area.
  const view: [number, number, number, number] = bbox ?? [
    PARIS_CENTER[0] - 0.015,
    PARIS_CENTER[1] - 0.015,
    PARIS_CENTER[0] + 0.015,
    PARIS_CENTER[1] + 0.015,
  ]
  const [w, s, e, n] = view
  const spanX = e - w
  const spanY = n - s
  const posRand = mulberry32(
    hashSeed(`${speciesId ?? 'all'}:${date}:${view.map(v => v.toFixed(2)).join(',')}`),
  )

  // Draw a point inset from the viewport edges so nothing sits on the border.
  const INSET = 0.15
  const px = () => w + spanX * (INSET + posRand() * (1 - 2 * INSET))
  const py = () => s + spanY * (INSET + posRand() * (1 - 2 * INSET))

  // ~2/3 of the points collapse into a tight cluster (yields the "12"-style
  // bubble once the map projects them into one pixel cell); the rest scatter.
  const clusterSize = count >= 6 ? Math.round(count * 0.66) : 0
  const clusterAnchor: [number, number] = [px(), py()]
  const capturedAt = new Date(Date.now() - Math.max(0, daysBack) * MS_PER_DAY).toISOString()
  const speciesPool = speciesId ? [speciesId] : MOCK_SPECIES.map(sp => sp.id)

  const sightings: Sighting[] = []
  for (let i = 0; i < count; i++) {
    const inCluster = i < clusterSize
    const coords: [number, number] = inCluster
      ? [
          clusterAnchor[0] + (posRand() - 0.5) * spanX * 0.02,
          clusterAnchor[1] + (posRand() - 0.5) * spanY * 0.02,
        ]
      : [px(), py()]
    const sid = speciesPool[Math.floor(posRand() * speciesPool.length)]
    sightings.push({
      id: `${sid}-${date}-${i}`,
      speciesId: sid,
      coords,
      bloomStage: BLOOM_STAGES[Math.floor(posRand() * BLOOM_STAGES.length)],
      capturedAt,
      // Give a couple of scattered points a photo for the thumbnail marker.
      ...(!inCluster && posRand() < 0.35
        ? { thumbnailUrl: `https://picsum.photos/seed/${sid}-${i}/96` }
        : {}),
    })
  }
  return sightings
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
}
