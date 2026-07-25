// Step 4: publish editing ("发布实况"). Pre-fills the confirmed species, bloom
// stage, and the location captured in the previous step, plus the read-only
// on-site capture time. The user completes the bloom stage and, after
// confirming time & location, publishes via the API shell — which routes
// to the success step. Coordinates stay in MapTiler LngLat end to end.
//
// Also serves the edit journey (journeyModeAtom 'edit', seeded by EditJourney):
// same form, but the header gains a back affordance, the copy switches to
// 编辑帖子/保存修改, and submit PATCHes the post then returns to its detail page.
//
// Layout mirrors the "发布实况" design. A single image is allowed per post
// (single-image model) — there is no add-more affordance.
import { useState } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useNavigate, useRouter } from '@tanstack/react-router'
import useSWR, { mutate } from 'swr'

import BackButton from '#/components/BackButton'
import { BLOOM_STAGES, api } from '#/lib/api'
import {
  captureAtom,
  formAtom,
  journeyModeAtom,
  selectedSpeciesAtom,
  stepAtom,
  submitStateAtom,
} from '#/features/share/state'

/** Format an ISO capture time as e.g. "2026 年 7 月 23 日 09:41". */
function formatCaptureTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function DetailStep() {
  const mode = useAtomValue(journeyModeAtom)
  const capture = useAtomValue(captureAtom)
  const [selectedSpecies, setSelectedSpecies] = useAtom(selectedSpeciesAtom)
  const [form, setForm] = useAtom(formAtom)
  const [submitState, setSubmitState] = useAtom(submitStateAtom)
  const setStep = useSetAtom(stepAtom)
  const router = useRouter()
  const navigate = useNavigate()
  const [confirmed, setConfirmed] = useState(false)

  const { data: speciesList = [] } = useSWR('species', () => api.listSpecies(), {
    revalidateOnFocus: false,
  })

  const isEdit = mode.kind === 'edit'
  const submitting = submitState.status === 'pending'
  const locationSummary = [form.locationName, form.areaName].filter(Boolean).join(' · ')

  // Required-field validation. Every field marked * must be complete before
  // publish/save: the domain model's Post.speciesId/bloomStage are non-null,
  // so a submit with gaps would create broken data. Whitespace-only place
  // names count as missing (trimmed again when building the payload).
  const missingFields = [
    !selectedSpecies && '物种',
    !form.bloomStage && '观赏状态',
    (form.locationName.trim() === '' || !form.coords) && '具体点位',
  ].filter((f): f is string => Boolean(f))
  const formValid = missingFields.length === 0

  /**
   * Leave the edit journey back to the post detail page. The normal entry is
   * detail -> edit (push), so going back keeps the history stack clean — a
   * plain push here would make the two pages' back buttons ping-pong forever.
   * Deep links have no history to pop, so fall back to a replace navigation.
   */
  function exitToDetail(postId: string) {
    if (router.history.canGoBack()) router.history.back()
    else void navigate({ to: '/post/$postId', params: { postId }, replace: true })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    // Re-check validity here too: an implicit form submission (e.g. Enter)
    // could bypass the disabled button.
    if (submitting || !capture || !confirmed || !formValid) return
    setSubmitState({ status: 'pending' })
    try {
      if (mode.kind === 'edit') {
        await api.updatePost(mode.postId, {
          speciesId: selectedSpecies?.id ?? null,
          bloomStage: form.bloomStage,
          location: { name: form.locationName.trim(), coords: form.coords },
        })
        // Refresh the detail page's cache before landing back on it.
        await mutate(['post', mode.postId])
        exitToDetail(mode.postId)
      } else {
        const result = await api.createPost({
          image: capture.dataUrl,
          capturedAt: capture.meta.capturedAt,
          speciesId: selectedSpecies?.id ?? null,
          bloomStage: form.bloomStage,
          location: { name: form.locationName.trim(), coords: form.coords },
        })
        setSubmitState({ status: 'success', id: result.id })
        setStep('success')
      }
    } catch (error) {
      setSubmitState({
        status: 'error',
        message: error instanceof Error ? error.message : isEdit ? '保存失败' : '发送失败',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="t-slide-in flex h-full flex-col bg-white">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
        {/* Edit mode arrives from the post detail page, so it needs a way back;
            create mode's steps own their own close/back affordances. */}
        <div className="flex items-center gap-2">
          {isEdit && <BackButton onClick={() => exitToDetail(mode.postId)} />}
          <h1 className="text-3xl font-bold text-ink">{isEdit ? '编辑帖子' : '发布实况'}</h1>
        </div>

        {/* Photo. Single-image model: exactly one capture, no add-more affordance. */}
        <div className="aspect-[16/10] w-full overflow-hidden rounded-3xl bg-celadon">
          {capture?.dataUrl && (
            <img src={capture.dataUrl} alt="所拍照片" className="h-full w-full object-cover" />
          )}
        </div>

        {/* 物种 */}
        <div className="rounded-2xl bg-ink/5 px-4 py-3">
          <span className="block text-xs text-muted">物种 *</span>
          <div className="mt-0.5 flex items-center gap-2">
            <select
              value={selectedSpecies?.id ?? ''}
              onChange={e =>
                setSelectedSpecies(speciesList.find(s => s.id === e.target.value) ?? null)
              }
              className="max-w-full bg-transparent text-sm text-ink focus:outline-none"
            >
              <option value="">未选择</option>
              {speciesList.map(species => (
                <option key={species.id} value={species.id}>
                  {species.commonName}
                </option>
              ))}
            </select>
            {selectedSpecies && <span className="text-sm text-muted">· 用户确认</span>}
          </div>
        </div>

        {/* 观赏状态 */}
        <fieldset>
          <legend className="text-xs text-muted">观赏状态 *</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {BLOOM_STAGES.map(stage => (
              // Gaining .t-select-pop on selection restarts the pop via class
              // toggle — no remount, so keyboard focus survives; deselecting
              // just drops the class (no pop).
              <button
                key={stage}
                type="button"
                onClick={() =>
                  setForm(prev => ({
                    ...prev,
                    bloomStage: prev.bloomStage === stage ? null : stage,
                  }))
                }
                className={
                  form.bloomStage === stage
                    ? 't-select-pop rounded-full bg-accent px-4 py-2 text-sm text-white transition-colors duration-150'
                    : 'rounded-full bg-ink/5 px-4 py-2 text-sm text-ink transition-colors duration-150'
                }
              >
                {stage}
              </button>
            ))}
          </div>
        </fieldset>

        {/* 具体点位 — corrected in the location step; tap to go back. */}
        <button
          type="button"
          onClick={() => setStep('location')}
          className="block w-full rounded-2xl bg-celadon px-4 py-3 text-left"
        >
          <span className="block text-xs text-muted">具体点位 *</span>
          <span className="mt-0.5 block text-sm text-ink">
            {locationSummary || '点按修正拍摄位置'}
          </span>
        </button>

        {/* 拍摄时间 — read-only, trusted field. */}
        <div className="rounded-2xl bg-peach px-4 py-3">
          <span className="block text-xs text-muted">拍摄时间 *</span>
          <span className="mt-0.5 block text-sm text-ink">
            {capture ? formatCaptureTime(capture.meta.capturedAt) : '—'}
          </span>
          <span className="mt-1 block text-xs text-muted">现场拍摄 · 可信字段，只读</span>
        </div>

        {/* Confirmation gate — draw-on checkbox: the real input stays sr-only
            for accessibility; the visual box mirrors its state and strokes
            the white check in on tick (25-checkbox-check). */}
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="sr-only"
          />
          <span className="t-checkbox" data-checked={confirmed || undefined} aria-hidden>
            {/* Path length ≈ 13.5 → --checkbox-dash: 14 in styles.css. */}
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path
                d="M1.5 5.5l3 3L10.5 1.5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          我已确认拍摄时间和地点
        </label>

        {/* Missing-field hint: the submit button stays disabled until every
            required field is complete; this line says why. */}
        {!formValid && (
          <p className="text-xs text-muted">还需完成：{missingFields.join('、')}</p>
        )}

        {submitState.status === 'error' && (
          // Mounted on failure, unmounted while a retry is pending — so the
          // shake replays on every failed submit without reflow tricks.
          <p className="t-shake-in text-sm text-red-600">{submitState.message}</p>
        )}
      </div>

      {/* Bottom actions. Create mode pairs 调整位置 with 发布实况 (same bar as
          RecognizeStep's 重拍 | 继续); edit mode keeps the single centered
          保存修改 — its back affordance lives in the header. */}
      {isEdit ? (
        <div className="flex items-center gap-3 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <button
            type="submit"
            disabled={submitting || !confirmed || !formValid}
            className="mx-auto rounded-full bg-ink px-16 py-3 text-sm text-white t-press disabled:opacity-40"
          >
            {submitting ? '保存中…' : '保存修改'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <button
            type="button"
            onClick={() => setStep('location')}
            className="w-full rounded-full bg-ink/5 py-3.5 text-sm text-ink t-press"
          >
            调整位置
          </button>
          <button
            type="submit"
            disabled={submitting || !confirmed || !formValid}
            className="w-full rounded-full bg-ink py-3.5 text-sm text-white t-press disabled:opacity-40"
          >
            {submitting ? '发布中…' : '发布实况'}
          </button>
        </div>
      )}
    </form>
  )
}
