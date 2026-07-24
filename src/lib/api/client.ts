// Minimal fetch wrapper — the single place real network calls land. Requests
// carry the Clerk session token (Bearer) when one is available; the mock
// implementation (see index.ts) bypasses this entirely.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

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

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(isPlainBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
