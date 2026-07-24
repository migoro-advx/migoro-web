// Step 3: location confirmation. Seeds the map from the capture coordinates
// (EXIF or geolocation) and lets the user drag the map to correct the point.
// Dragging updates form.coords and reverse-geocodes to refresh the place name
// (unless the user has typed one). 地点 / 具体区域 are editable; the search box
// and the sensitivity notice are presentational for now (forward search and
// the coordinate-protection rule are backend concerns not yet wired).
//
// Layout mirrors the "确认拍摄位置" design.
import { lazy, Suspense, useEffect, useState } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import useSWR from 'swr'

import type { LngLat } from '#/lib/api'
import { reverseGeocode } from '#/lib/geocoding'
import { captureAtom, formAtom, locationEditedAtom, stepAtom } from '#/features/share/state'

const LocationPickerMap = lazy(() => import('#/features/share/LocationPickerMap'))

export default function LocationStep() {
  const capture = useAtomValue(captureAtom)
  const [form, setForm] = useAtom(formAtom)
  const setStep = useSetAtom(stepAtom)
  const [search, setSearch] = useState('')
  // Persisted across steps: once the user edits the place name, stop
  // auto-filling it from geocoding — even after navigating back into this step.
  const [locationEdited, setLocationEdited] = useAtom(locationEditedAtom)

  // Seed coordinates from the capture once when entering the step.
  useEffect(() => {
    if (form.coords == null && capture?.meta.coords) {
      setForm(prev => ({ ...prev, coords: capture.meta.coords }))
    }
  }, [])

  // Resolve a human-readable place name from the current coordinates.
  const { data: resolvedPlace, isLoading: resolving } = useSWR(
    form.coords ? ['reverse', form.coords[0], form.coords[1]] : null,
    () => reverseGeocode(form.coords as LngLat),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  // Fill the resolved place name unless the user has already typed one. This
  // still updates on drag (new coords -> new resolvedPlace) while `locationEdited`
  // is false, which is the intended "drag to correct the point" behavior.
  useEffect(() => {
    if (!locationEdited && resolvedPlace) {
      setForm(prev => ({ ...prev, locationName: resolvedPlace }))
    }
  }, [resolvedPlace, locationEdited, setForm])

  function handleCenterChange(coords: LngLat) {
    setForm(prev => ({ ...prev, coords }))
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <h1 className="text-3xl font-bold text-ink">确认拍摄位置</h1>
        <p className="mt-1 text-sm text-muted">请修正到入口、区段或观赏区域</p>
      </div>

      {/* Draggable map region with an overlaid search field. */}
      <div className="relative mt-4 min-h-0 flex-1">
        <Suspense fallback={<div className="h-full w-full bg-celadon" />}>
          <LocationPickerMap center={form.coords} onCenterChange={handleCenterChange} />
        </Suspense>

        {/* Presentational search field, overlaid on the map. */}
        <div className="absolute left-4 top-4 max-w-[62%]">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-lg ring-1 ring-black/5">
            <span aria-hidden className="text-muted">
              ⌕
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索地点或入口"
              className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
            />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <span className="rounded-full bg-white/85 px-3 py-1 text-xs text-muted">
            拖动地图修正点位
          </span>
        </div>
      </div>

      {/* Fields + confirm. */}
      <div className="space-y-3 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <label className="block rounded-2xl bg-ink/5 px-4 py-3">
          <span className="block text-xs text-muted">地点</span>
          <input
            type="text"
            value={form.locationName}
            onChange={e => {
              setLocationEdited(true)
              setForm(prev => ({ ...prev, locationName: e.target.value }))
            }}
            placeholder={resolving ? '定位中…' : '填写地点'}
            className="mt-0.5 w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
        </label>

        <label className="block rounded-2xl bg-ink/5 px-4 py-3">
          <span className="block text-xs text-muted">具体区域</span>
          <input
            type="text"
            value={form.areaName}
            onChange={e => setForm(prev => ({ ...prev, areaName: e.target.value }))}
            placeholder="如：湖畔入口 · 东侧花带"
            className="mt-0.5 w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
        </label>

        <div className="w-fit rounded-xl bg-peach px-4 py-2 text-xs text-accent">
          · 敏感地点将自动保护公开坐标
        </div>

        <button
          type="button"
          onClick={() => setStep('detail')}
          className="w-full rounded-full bg-ink px-8 py-3 text-sm text-white"
        >
          确认位置
        </button>
      </div>
    </div>
  )
}
