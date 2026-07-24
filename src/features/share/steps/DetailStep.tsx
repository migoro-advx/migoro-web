// Step 3: detail editing. Pre-fills the confirmed species and the captured
// coordinates (from EXIF or geolocation), lets the user adjust species, bloom
// stage, location and description, then submits via the API shell. Coordinates
// stay in MapTiler LngLat ([lng, lat]) end to end.
//
// Minimal styling — real design comes later.
import { useEffect, useRef } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import useSWR from 'swr'

import { BLOOM_STAGES, api } from '#/lib/api'
import type { CoordsSource, LngLat } from '#/lib/api'
import { reverseGeocode } from '#/lib/geocoding'
import {
  captureAtom,
  formAtom,
  selectedSpeciesAtom,
  submitStateAtom,
  useResetShare,
} from '#/features/share/state'

const COORDS_SOURCE_LABEL: Record<CoordsSource, string> = {
  exif: '来自照片 EXIF',
  geolocation: '来自当前定位',
  none: '暂无定位，请手动填写',
}

export default function DetailStep({ onClose }: { onClose: () => void }) {
  const capture = useAtomValue(captureAtom)
  const [selectedSpecies, setSelectedSpecies] = useAtom(selectedSpeciesAtom)
  const [form, setForm] = useAtom(formAtom)
  const [submitState, setSubmitState] = useAtom(submitStateAtom)
  const resetShare = useResetShare()
  // Once the user edits the location name, stop auto-filling it.
  const locationEditedRef = useRef(false)

  const { data: speciesList = [] } = useSWR('species', () => api.listSpecies(), {
    revalidateOnFocus: false,
  })

  // Resolve a human-readable place name from the coordinates (EXIF or
  // geolocation) so the location field defaults to the current location.
  const { data: resolvedPlace, isLoading: resolvingLocation } = useSWR(
    form.coords ? ['reverse', form.coords[0], form.coords[1]] : null,
    () => reverseGeocode(form.coords as LngLat),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  // Seed the location coordinates from the capture once when entering the step.
  useEffect(() => {
    if (form.coords == null && capture?.meta.coords) {
      setForm(prev => ({ ...prev, coords: capture.meta.coords }))
    }
  }, [])

  // Fill the resolved place name unless the user has already typed one.
  useEffect(() => {
    if (!locationEditedRef.current && resolvedPlace) {
      setForm(prev => (prev.locationName ? prev : { ...prev, locationName: resolvedPlace }))
    }
  }, [resolvedPlace, setForm])

  const coordsSource = capture?.meta.coordsSource ?? 'none'
  const submitting = submitState.status === 'pending'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting || !capture) return
    setSubmitState({ status: 'pending' })
    try {
      const result = await api.createPost({
        image: capture.dataUrl,
        capturedAt: capture.meta.capturedAt,
        speciesId: selectedSpecies?.id ?? null,
        bloomStage: form.bloomStage,
        location: { name: form.locationName, coords: form.coords },
        description: form.description,
      })
      setSubmitState({ status: 'success', id: result.id })
      resetShare()
      onClose()
    } catch (error) {
      setSubmitState({
        status: 'error',
        message: error instanceof Error ? error.message : '发送失败',
      })
    }
  }

  function updateCoord(index: 0 | 1, value: string) {
    const num = Number(value)
    if (Number.isNaN(num)) return
    setForm(prev => {
      const base = prev.coords ?? [0, 0]
      const next: [number, number] = index === 0 ? [num, base[1]] : [base[0], num]
      return { ...prev, coords: next }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {capture && (
          <img src={capture.dataUrl} alt="所拍照片" className="h-40 w-full rounded object-cover" />
        )}

        <label className="block">
          <span className="mb-1 block text-sm text-gray-700">物种</span>
          <select
            value={selectedSpecies?.id ?? ''}
            onChange={event =>
              setSelectedSpecies(speciesList.find(s => s.id === event.target.value) ?? null)
            }
            className="w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="">未选择</option>
            {speciesList.map(species => (
              <option key={species.id} value={species.id}>
                {species.commonName}（{species.scientificName}）
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="mb-1 text-sm text-gray-700">花开状态</legend>
          <div className="flex flex-wrap gap-2">
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
                    ? 'rounded border border-gray-900 bg-gray-900 px-3 py-1.5 text-sm text-white'
                    : 'rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700'
                }
              >
                {stage}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-1 block text-sm text-gray-700">拍摄地点</span>
          <input
            type="text"
            value={form.locationName}
            onChange={event => {
              locationEditedRef.current = true
              setForm(prev => ({ ...prev, locationName: event.target.value }))
            }}
            placeholder={resolvingLocation ? '定位中…' : '填写拍摄地点'}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
          <span className="mt-1 block text-xs text-gray-500">坐标{COORDS_SOURCE_LABEL[coordsSource]}，可修正</span>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              step="any"
              value={form.coords?.[0] ?? ''}
              onChange={event => updateCoord(0, event.target.value)}
              placeholder="经度 lng"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="any"
              value={form.coords?.[1] ?? ''}
              onChange={event => updateCoord(1, event.target.value)}
              placeholder="纬度 lat"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-gray-700">描述</span>
          <textarea
            value={form.description}
            onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
            rows={3}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>

        {submitState.status === 'error' && (
          <p className="text-sm text-red-600">{submitState.message}</p>
        )}
      </div>

      <div className="border-t border-gray-200 px-4 py-3">
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-blue-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {submitting ? '发送中…' : '发送'}
        </button>
      </div>
    </form>
  )
}
