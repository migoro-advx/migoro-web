// Single entry point for the app's API. `VITE_USE_MOCK_API` toggles a full-mock
// mode (for offline dev); otherwise the app runs a hybrid: species listing and
// recognition hit the real backend, while createPost / listSightings and the
// place/post reads (getPlaceSummary / listPlacePosts / getPost) stay on the mock
// because the backend has no endpoint for them yet. Callers only ever
// import `api` from here, so this composition is the only place that changes.
import { mockApi } from './endpoints.mock'
import { realApi } from './endpoints.real'
import type { Api } from './types'

// Full mock is the default; opt into the real backend with "false".
const useMock = import.meta.env.VITE_USE_MOCK_API !== 'false'

export const api: Api = useMock
  ? mockApi
  : {
      ...mockApi,
      listSpecies: realApi.listSpecies,
      recognizeSpecies: realApi.recognizeSpecies,
    }

export * from './types'
export { ApiError } from './client'
