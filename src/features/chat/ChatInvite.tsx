// Chat-invite modal (问问 AI). Opened from the map's top bar (see
// routes/index.tsx). Collects a phone number + email, invites the user via the
// Photon Spectrum proxy server function, then shows the assigned iMessage
// number with copy + SMS deep-link actions.
//
// Client-only: index.tsx only mounts this when `chatOpenAtom` is true, so no
// browser API (localStorage/clipboard) runs during SSR.
import { useState } from 'react'
import { useSetAtom } from 'jotai'

import { inviteChatUser } from './invite'
import { chatOpenAtom } from './state'

/** localStorage key holding the last successful invite. */
const STORAGE_KEY = 'migoro:chat-invite'

/** Prefilled first message for the SMS deep link. */
const INVITE_MESSAGE = '你好，見頃！现在有什么花正当季？'

/** Lightweight email shape check — the backend re-validates strictly. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface StoredInvite {
  userId: string
  assignedPhoneNumber: string
  /** The visitor's own number, kept so 换个号码 can prefill the form. */
  phoneNumber: string
}

// China-demo only: the +86 country code is fixed in the UI and cannot be
// changed — users type just the 11-digit mainland number.
const PHONE_PREFIX = '+86'

/**
 * Normalize the national-number input to E.164: strip spaces/dashes and
 * require an 11-digit mainland number (1xxxxxxxxxx), then prepend +86.
 */
function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s-]/g, '')
  if (/^1\d{10}$/.test(cleaned)) return `${PHONE_PREFIX}${cleaned}`
  return null
}

function loadStoredInvite(): StoredInvite | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredInvite>
    // Validate every field — reset() dereferences phoneNumber unguarded.
    return typeof parsed.userId === 'string' &&
        typeof parsed.assignedPhoneNumber === 'string' &&
        typeof parsed.phoneNumber === 'string'
      ? (parsed as StoredInvite)
      : null
  } catch {
    return null
  }
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4.5 13.8 9.7 19 11.5l-5.2 1.8L12 18.5l-1.8-5.2L5 11.5l5.2-1.8L12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M18.5 3.5v3M20 5h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function ChatInvite() {
  const setOpen = useSetAtom(chatOpenAtom)

  // Seed from the last successful invite so returning users land straight on
  // the number screen (the invite API is idempotent per phone number anyway).
  const [invite, setInvite] = useState<StoredInvite | null>(loadStoredInvite)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const normalizedPhone = normalizePhone(phone)
  const canSubmit = normalizedPhone !== null && EMAIL_RE.test(email.trim()) && !submitting

  async function submit() {
    if (!normalizedPhone || !canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await inviteChatUser({
        data: { phoneNumber: normalizedPhone, email: email.trim() },
      })
      if (result.ok) {
        const stored: StoredInvite = {
          userId: result.userId,
          assignedPhoneNumber: result.assignedPhoneNumber,
          phoneNumber: normalizedPhone,
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
        } catch {
          // Private mode etc. — showing the number still works this session.
        }
        setInvite(stored)
      } else {
        setError(result.message)
      }
    } catch {
      setError('网络异常，请稍后再试。')
    } finally {
      setSubmitting(false)
    }
  }

  async function copyNumber() {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.assignedPhoneNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked — the number is on screen, nothing else to do.
    }
  }

  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore storage failures — state reset below is what matters.
    }
    // Stored numbers are E.164 (+86…); the input holds only the national part.
    setPhone(invite?.phoneNumber.replace(PHONE_PREFIX, '') ?? '')
    setInvite(null)
    setCopied(false)
    setError(null)
  }

  // `?&body=` is the SMS-URI form both iOS and Android honor.
  const smsHref = invite
    ? `sms:${invite.assignedPhoneNumber}?&body=${encodeURIComponent(INVITE_MESSAGE)}`
    : undefined

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Scrim — tap to dismiss. */}
      <button
        type="button"
        aria-label="关闭"
        onClick={() => setOpen(false)}
        className="t-fade-in absolute inset-0 bg-ink/20"
      />
      <div className="t-modal-in relative mx-6 w-full max-w-xs rounded-3xl bg-white px-6 py-7 shadow-[0_8px_24px_rgba(214,138,95,.18)] ring-1 ring-black/5">
        <div className="flex items-center gap-2">
          <SparkIcon className="text-accent" />
          <h2 className="text-base font-semibold text-ink">问问 AI</h2>
        </div>

        {invite ? (
          <>
            <p className="mt-3 text-sm text-muted">
              已开通！用 iMessage / 短信发消息到这个号码，就能和見頃 AI 聊花期：
            </p>
            <p className="mt-4 text-center text-xl font-semibold tracking-wide text-ink">
              {invite.assignedPhoneNumber}
            </p>
            <div className="mt-5 flex w-full flex-col gap-2">
              <a
                href={smsHref}
                className="w-full rounded-full bg-accent py-3 text-center text-sm font-medium text-white t-press"
              >
                打开信息开始聊天
              </a>
              <button
                type="button"
                onClick={copyNumber}
                className="w-full rounded-full bg-celadon py-3 text-sm text-ink t-press"
              >
                {copied ? '已复制' : '复制号码'}
              </button>
              <button
                type="button"
                onClick={reset}
                className="w-full rounded-full bg-ink/5 py-3 text-sm text-ink t-press"
              >
                换个号码
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted">
              填写手机号和邮箱，我们会为你开通 iMessage 聊天。
            </p>
            <form
              className="mt-4 flex w-full flex-col gap-2"
              onSubmit={event => {
                event.preventDefault()
                void submit()
              }}
            >
              <div className="flex w-full items-center rounded-full bg-ink/5 focus-within:ring-2 focus-within:ring-accent/40">
                {/* Fixed country code — China demo, not editable. */}
                <span className="shrink-0 pl-4 text-sm text-ink" aria-hidden>
                  {PHONE_PREFIX}
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  placeholder="手机号（如 13800138000）"
                  className="w-full bg-transparent py-3 pr-4 pl-2 text-sm text-ink placeholder:text-muted outline-none"
                />
              </div>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="邮箱"
                className="w-full rounded-full bg-ink/5 px-4 py-3 text-sm text-ink placeholder:text-muted outline-none focus:ring-2 focus:ring-accent/40"
              />
              {error && <p className="px-1 text-xs text-accent-strong">{error}</p>}
              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-1 w-full rounded-full bg-accent py-3 text-sm font-medium text-white t-press disabled:opacity-40"
              >
                {submitting ? '开通中…' : '开始聊天'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
