// Minimal fetch wrapper — the single place real network calls land. Requests
// carry the Clerk session token (Bearer) when one is available, fall back to
// the bare `Guest` credential in guest mode, and are anonymous otherwise; the
// mock implementation (see index.ts) bypasses this entirely.
import { isGuestMode } from '#/features/auth/guest'

export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * Absolute URL for a backend asset path (e.g. `/api/images/{uuid}`). Prefixes
 * the API origin so a relative path from a VO can be used directly as an
 * `<img src>`. With an empty BASE_URL (same origin) the relative path is
 * returned unchanged.
 */
export function assetUrl(path: string): string {
  return `${BASE_URL}${path}`
}

/**
 * Clerk session token for the current user, or null. Read from the browser
 * Clerk instance so plain (non-hook) call sites can authenticate. Returns null
 * during SSR (no `window`) and when signed out.
 */
async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    return (await window.Clerk?.session?.getToken()) ?? null
  } catch {
    return null
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Plain object serialized as JSON, or a preassembled BodyInit. */
  body?: unknown
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options

  const isPlainBody = body != null && !(body instanceof FormData) && !(body instanceof Blob)
  const token = await getAuthToken()
  // A real session always wins over guest mode; `Guest` is the whole header
  // value (no Bearer prefix) — the backend's undocumented guest credential.
  const authorization = token ? `Bearer ${token}` : isGuestMode() ? 'Guest' : undefined

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(isPlainBody ? { 'Content-Type': 'application/json' } : {}),
      ...(authorization ? { Authorization: authorization } : {}),
      ...headers,
    },
    body: isPlainBody ? JSON.stringify(body) : (body as BodyInit | undefined),
  })

  const raw = await response.text()
  const parsed = raw ? safeParse(raw) : null

  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.status}`, response.status, parsed ?? raw)
  }

  return parsed as T
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}
