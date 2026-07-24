// Minimal fetch wrapper — the single place real network calls will land once a
// backend exists. Today only the mock implementation is wired up (see index.ts),
// so this is intentionally a thin, stable shell.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

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

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(isPlainBody ? { 'Content-Type': 'application/json' } : {}),
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
