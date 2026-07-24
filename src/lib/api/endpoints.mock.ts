// Mock implementation used while the backend is unavailable. Shares the `Api`
// surface with endpoints.real.ts so callers never change. Replace by flipping
// VITE_USE_MOCK_API to false (see index.ts).
import type { Api, CreatePostPayload, CreatePostResult, RecognitionCandidate, Species } from './types'

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
}
