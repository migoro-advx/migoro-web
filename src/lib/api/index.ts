// Single entry point for the app's API. `VITE_USE_MOCK_API` toggles a full-mock
// mode (for offline dev); otherwise the app runs entirely against the real
// backend. The post reads (listSightings / getPlaceSummary / listPlacePosts /
// getPost) are now public endpoints and publish (createPost) hits the
// login-gated POST /api/posts — see endpoints.real.ts. Callers only ever import
// `api` from here, so this composition is the only place that changes.
import { mockApi } from './endpoints.mock'
import { realApi } from './endpoints.real'
import type { Api } from './types'

// Full mock is the default; opt into the real backend with "false".
const useMock = import.meta.env.VITE_USE_MOCK_API !== 'false'

export const api: Api = useMock ? mockApi : realApi

export * from './types'
export { ApiError } from './client'
