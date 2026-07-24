import { lazy, Suspense } from 'react'
import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { useAtomValue, useSetAtom } from 'jotai'

import { AuthOverlay } from '#/components/AuthOverlay'
import BottomNav, { NAV_OFFSET } from '#/components/BottomNav'
import TimeDial from '#/components/TimeDial'
import { placeNameAtom, selectedDayAtom } from '#/features/sightings/state'
import { useSightings } from '#/features/sightings/useSightings'
import { queryOpenAtom, selectedSpeciesAtom } from '#/features/species/state'

const MapTilerMap = lazy(() => import('#/components/MapTilerMap'))
const SpeciesQuery = lazy(() => import('#/features/species/SpeciesQuery'))
const SightingsMarkers = lazy(() => import('#/features/sightings/SightingsMarkers'))

export const Route = createFileRoute('/')({ component: Home })

const MS_PER_DAY = 86_400_000

/** "今天" / "昨天" / "N天前" + "M月D日" for the dial's center label. */
function dayLabel(day: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const picked = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const daysBack = Math.round((today.getTime() - picked.getTime()) / MS_PER_DAY)
  const rel = daysBack <= 0 ? '今天' : daysBack === 1 ? '昨天' : `${daysBack}天前`
  return `${rel} · ${picked.getMonth() + 1}月${picked.getDate()}日`
}

function Home() {
  const selectedSpecies = useAtomValue(selectedSpeciesAtom)
  const setSpecies = useSetAtom(selectedSpeciesAtom)
  const queryOpen = useAtomValue(queryOpenAtom)
  const setQueryOpen = useSetAtom(queryOpenAtom)
  const selectedDay = useAtomValue(selectedDayAtom)
  const setSelectedDay = useSetAtom(selectedDayAtom)
  const placeName = useAtomValue(placeNameAtom)

  const { count, isLoading } = useSightings()
  const showEmptyState = Boolean(selectedSpecies) && !isLoading && count === 0

  const subtitle = selectedSpecies
    ? count > 0
      ? `${selectedSpecies.commonName} · ${count}条实况`
      : '暂无实况'
    : undefined

  return (
    <div className="fixed inset-0">
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <MapTilerMap>
            <SightingsMarkers />
          </MapTilerMap>
        </Suspense>
      </ClientOnly>

      {/* Top search field + 定位胶囊. Mirrors the design's top bar enough to
          drive the species-query overlay and reflect the current filter. */}
      <div className="fixed inset-x-0 top-0 z-40 px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-lg ring-1 ring-black/5">
            <span aria-hidden className="text-neutral-400">
              ⌕
            </span>
            <button
              type="button"
              onClick={() => setQueryOpen(true)}
              className="flex-1 text-left text-sm text-neutral-800"
            >
              {selectedSpecies ? (
                selectedSpecies.commonName
              ) : (
                <span className="text-neutral-400">查哪一种花？</span>
              )}
            </button>
            {selectedSpecies && (
              <button
                type="button"
                onClick={() => setSpecies(null)}
                className="text-sm text-orange-500"
              >
                清除
              </button>
            )}
          </div>
          {placeName && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs text-neutral-600 shadow-md ring-1 ring-black/5">
              <span aria-hidden className="text-neutral-400">
                ⌖
              </span>
              {placeName}
            </div>
          )}
        </div>
      </div>

      {/* Empty state — no sightings for this species on this day. */}
      {showEmptyState && selectedSpecies && (
        <div className="pointer-events-none fixed inset-x-0 top-1/2 z-30 -translate-y-1/2 px-6">
          <div className="mx-auto w-full max-w-md rounded-3xl bg-white px-6 py-5 shadow-xl ring-1 ring-black/5">
            <p className="text-base font-semibold text-neutral-900">
              这一天暂时没有「{selectedSpecies.commonName}」实况。
            </p>
            <p className="mt-1.5 text-sm text-neutral-400">
              换一天看看，或分享你在现场看到的样子。
            </p>
          </div>
        </div>
      )}

      <TimeDial
        value={selectedDay}
        onChange={setSelectedDay}
        bottomOffset={NAV_OFFSET}
        label={dayLabel(selectedDay)}
        subtitle={subtitle}
      />

      <BottomNav />

      {queryOpen && (
        <Suspense fallback={null}>
          <SpeciesQuery />
        </Suspense>
      )}
      <AuthOverlay />
    </div>
  )
}
