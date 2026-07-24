// Single entry point for the app's API. Swaps between the mock and the real
// implementation via VITE_USE_MOCK_API. Callers only ever import `api` from
// here, so switching to the real backend is a config change, not a code change.
import { mockApi } from './endpoints.mock'
import { realApi } from './endpoints.real'
import type { Api } from './types'

// Mock is the default while no backend exists; opt into real with "false".
const useMock = import.meta.env.VITE_USE_MOCK_API !== 'false'

export const api: Api = useMock ? mockApi : realApi

export * from './types'
export { ApiError } from './client'
