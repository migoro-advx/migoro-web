// Server-side proxy for Photon Spectrum's user-invite flow. The Spectrum API
// cannot be called from the browser (it sends no CORS headers) and it
// authenticates with the project *secret*, so this server function is the only
// place that talks to it. Contract verified against the official OpenAPI spec
// (https://spectrum.photon.codes/openapi/json):
//
//   POST /projects/{id}/users/  — create (or idempotently re-fetch) a user;
//     the response's `assignedPhoneNumber` is the iMessage line the user texts.
//   GET  /projects/{id}/imessage/    — whether the project is shared/dedicated.
//   GET  /projects/{id}/lines/route  — best dedicated line for a new user.
import { createServerFn } from '@tanstack/react-start'

const SPECTRUM_BASE_URL = 'https://spectrum.photon.codes'

/** E.164 phone number, as required by the Spectrum API. */
const E164_RE = /^\+[1-9]\d{6,14}$/

export interface InviteInput {
  /** E.164 phone number of the person to invite. */
  phoneNumber: string
  /** Contact email (required by our form; optional at the API level). */
  email: string
}

export type InviteResult =
  | { ok: true; userId: string; assignedPhoneNumber: string }
  | { ok: false; message: string }

/** Minimal envelope every Spectrum endpoint uses. */
interface SpectrumEnvelope<T> {
  succeed: boolean
  data: T
  message?: string
}

async function spectrumFetch<T>(
  path: string,
  authorization: string,
  init?: RequestInit,
): Promise<{ status: number; body: SpectrumEnvelope<T> | null }> {
  const response = await fetch(`${SPECTRUM_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  let body: SpectrumEnvelope<T> | null = null
  try {
    body = (await response.json()) as SpectrumEnvelope<T>
  } catch {
    // Non-JSON error body — keep null and let the caller map the status.
  }
  return { status: response.status, body }
}

export const inviteChatUser = createServerFn({ method: 'POST' })
  .validator((input: InviteInput): InviteInput => {
    // Typed for callers, but still runtime-checked — the payload arrives over
    // the wire.
    if (typeof input.phoneNumber !== 'string' || !E164_RE.test(input.phoneNumber)) {
      throw new Error('phoneNumber must be E.164')
    }
    if (typeof input.email !== 'string' || input.email.length === 0) {
      throw new Error('email is required')
    }
    return { phoneNumber: input.phoneNumber, email: input.email }
  })
  .handler(async ({ data }): Promise<InviteResult> => {
    const projectId = process.env.PHOTON_PROJECT_ID
    const projectSecret = process.env.PHOTON_PROJECT_SECRET
    if (!projectId || !projectSecret) {
      return { ok: false, message: '聊天服务未配置，请稍后再试。' }
    }
    const authorization = `Basic ${btoa(`${projectId}:${projectSecret}`)}`

    try {
      // Shared projects assign a number from Photon's pool; dedicated projects
      // must pin the user to a line the project owns, picked via /lines/route.
      const info = await spectrumFetch<{ type: 'shared' | 'dedicated' }>(
        `/projects/${projectId}/imessage/`,
        authorization,
      )
      if (!info.body?.succeed) {
        return { ok: false, message: '聊天服务暂时不可用，请稍后再试。' }
      }

      let payload: Record<string, string>
      if (info.body.data.type === 'dedicated') {
        const route = await spectrumFetch<{ line: { phoneNumber: string } }>(
          `/projects/${projectId}/lines/route`,
          authorization,
        )
        if (!route.body?.succeed) {
          return { ok: false, message: '暂时没有可用的聊天线路，请稍后再试。' }
        }
        payload = {
          type: 'dedicated',
          phoneNumber: data.phoneNumber,
          assignedPhoneNumber: route.body.data.line.phoneNumber,
          email: data.email,
        }
      } else {
        payload = { type: 'shared', phoneNumber: data.phoneNumber, email: data.email }
      }

      const created = await spectrumFetch<{ id: string; assignedPhoneNumber: string }>(
        `/projects/${projectId}/users/`,
        authorization,
        { method: 'POST', body: JSON.stringify(payload) },
      )
      if (!created.body?.succeed) {
        return {
          ok: false,
          message:
            created.status === 400
              ? '手机号或邮箱格式不正确，请检查后重试。'
              : '邀请失败，请稍后再试。',
        }
      }

      return {
        ok: true,
        userId: created.body.data.id,
        assignedPhoneNumber: created.body.data.assignedPhoneNumber,
      }
    } catch {
      return { ok: false, message: '网络异常，请稍后再试。' }
    }
  })
