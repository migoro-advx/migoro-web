// Real backend implementation. Not active yet (VITE_USE_MOCK_API defaults to
// true) — kept in sync with the mock so switching over is a one-line change in
// index.ts. Endpoint paths are best-effort placeholders; adjust when the real
// API contract lands.
import { request } from './client'
import type {
  Api,
  CreatePostPayload,
  CreatePostResult,
  RecognitionCandidate,
  Sighting,
  SightingsQuery,
  Species,
} from './types'

export const realApi: Api = {
  recognizeSpecies(image: string): Promise<RecognitionCandidate[]> {
    return request<RecognitionCandidate[]>('/recognition', {
      method: 'POST',
      body: { image },
    })
  },

  createPost(payload: CreatePostPayload): Promise<CreatePostResult> {
    return request<CreatePostResult>('/posts', {
      method: 'POST',
      body: payload,
    })
  },

  listSpecies(): Promise<Species[]> {
    return request<Species[]>('/species', { method: 'GET' })
  },

  listSightings(params: SightingsQuery): Promise<Sighting[]> {
    const search = new URLSearchParams({ date: params.date })
    if (params.speciesId) search.set('speciesId', params.speciesId)
    if (params.bbox) search.set('bbox', params.bbox.join(','))
    return request<Sighting[]>(`/sightings?${search.toString()}`, { method: 'GET' })
  },
}
