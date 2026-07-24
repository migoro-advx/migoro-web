/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAPTILER_API_KEY: string
  readonly VITE_USE_MOCK_API?: string
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Clerk attaches its browser instance to `window.Clerk` once ClerkProvider
// mounts. The API client reads a session token from it (client-only) to
// authenticate real backend calls. Minimal surface — just what we use.
interface Window {
  Clerk?: {
    session?: {
      getToken: (opts?: { template?: string }) => Promise<string | null>
    }
  }
}
