// Step 4: publish editing ("发布实况"). Pre-fills the confirmed species, bloom
// stage, and the location captured in the previous step, plus the read-only
// on-site capture time. The user completes the bloom stage and, after
// confirming time & location, publishes via the API shell — which routes
// to the success step. Coordinates stay in MapTiler LngLat end to end.
//
// Layout mirrors the "发布实况" design. A single image is allowed per post
// (single-image model) — there is no add-more affordance.
import { useState } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import useSWR from 'swr'

import { BLOOM_STAGES, api } from '#/lib/api'
import {
  captureAtom,
  formAtom,
  selectedSpeciesAtom,
  stepAtom,
  submitStateAtom,
} from '#/features/share/state'

/** Format an ISO capture time as e.g. "2026年7月23日 09:41". */
function formatCaptureTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function DetailStep() {
  const capture = useAtomValue(captureAtom)
  const [selectedSpecies, setSelectedSpecies] = useAtom(selectedSpeciesAtom)
  const [form, setForm] = useAtom(formAtom)
  const [submitState, setSubmitState] = useAtom(submitStateAtom)
  const setStep = useSetAtom(stepAtom)
  const [confirmed, setConfirmed] = useState(false)

  const { data: speciesList = [] } = useSWR('species', () => api.listSpecies(), {
    revalidateOnFocus: false,
  })

  const submitting = submitState.status === 'pending'
  const locationSummary = [form.locationName, form.areaName].filter(Boolean).join(' · ')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting || !capture || !confirmed) return
    setSubmitState({ status: 'pending' })
    try {
      const result = await api.createPost({
        image: capture.dataUrl,
        capturedAt: capture.meta.capturedAt,
        speciesId: selectedSpecies?.id ?? null,
        bloomStage: form.bloomStage,
        location: { name: form.locationName, coords: form.coords },
      })
      setSubmitState({ status: 'success', id: result.id })
      setStep('success')
    } catch (error) {
      setSubmitState({
        status: 'error',
        message: error instanceof Error ? error.message : '发送失败',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col bg-white">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
        <h1 className="text-3xl font-bold text-ink">发布实况</h1>

        {/* Photo. Single-image model: exactly one capture, no add-more affordance. */}
        <div className="aspect-[16/10] w-full overflow-hidden rounded-3xl bg-celadon">
          {capture && (
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
                    ? 'rounded-full bg-accent px-4 py-2 text-sm text-white'
                    : 'rounded-full bg-ink/5 px-4 py-2 text-sm text-ink'
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

        {/* Confirmation gate. */}
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="h-4 w-4 accent-ink"
          />
          我已确认拍摄时间和地点
        </label>

        {submitState.status === 'error' && (
          <p className="text-sm text-red-600">{submitState.message}</p>
        )}
      </div>

      {/* Bottom action: 发布实况. */}
      <div className="flex items-center gap-3 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <button
          type="submit"
          disabled={submitting || !confirmed}
          className="mx-auto rounded-full bg-ink px-16 py-3 text-sm text-white disabled:opacity-40"
        >
          {submitting ? '发布中…' : '发布实况'}
        </button>
      </div>
    </form>
  )
}
