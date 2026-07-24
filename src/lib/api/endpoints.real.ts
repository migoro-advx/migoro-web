// Real backend implementation for the endpoints the backend actually provides:
// species listing and image recognition. createPost / listSightings have no
// backend endpoint yet, so index.ts composes those from the mock — this module
// only implements the two live methods.
import { request } from './client'
import type { Api, RecognitionCandidate, Species } from './types'

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

export const realApi: Pick<Api, 'listSpecies' | 'recognizeSpecies'> = {
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
}
