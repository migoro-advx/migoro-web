import { lazy, Suspense } from 'react'
import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { useAtomValue, useSetAtom } from 'jotai'

import { AuthOverlay } from '#/components/AuthOverlay'
import BottomNav, { NAV_OFFSET } from '#/components/BottomNav'
import TimeDial from '#/components/TimeDial'
import { SproutMark } from '#/brand/illustrations'
import { placeNameAtom, selectedDayAtom } from '#/features/sightings/state'
import { useSightings } from '#/features/sightings/useSightings'
import { queryOpenAtom, selectedSpeciesAtom } from '#/features/species/state'

const MapTilerMap = lazy(() => import('#/components/MapTilerMap'))
const SpeciesQuery = lazy(() => import('#/features/species/SpeciesQuery'))
const SightingsMarkers = lazy(() => import('#/features/sightings/SightingsMarkers'))

export const Route = createFileRoute('/')({ component: Home })

const MS_PER_DAY = 86_400_000

/** Height of the visible dial dome (matches TimeDial's default reveal). */
const DIAL_REVEAL = '240px'

function MagnifierIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="text-muted">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="text-accent">
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <path
        d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

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
            <MagnifierIcon />
            <button
              type="button"
              onClick={() => setQueryOpen(true)}
              className="flex-1 text-left text-sm text-ink"
            >
              {selectedSpecies ? (
                selectedSpecies.commonName
              ) : (
                <span className="text-muted">查哪一种花？</span>
              )}
            </button>
            {selectedSpecies && (
              <button
                type="button"
                onClick={() => setSpecies(null)}
                className="text-sm font-medium text-accent"
              >
                清除
              </button>
            )}
          </div>
          {placeName && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs text-ink shadow-md ring-1 ring-black/5">
              <PinIcon />
              {placeName}
            </div>
          )}
        </div>
      </div>

      {/* Empty state — no sightings for this species on this day. Anchored just
          above the dial dome (peach card with a sprout), per the mockup. */}
      {showEmptyState && selectedSpecies && (
        <div
          className="pointer-events-none fixed inset-x-0 z-30 px-6"
          style={{ bottom: `calc(${NAV_OFFSET} + ${DIAL_REVEAL} + 1.5rem)` }}
        >
          <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-3xl bg-peach px-6 py-5 shadow-[0_10px_30px_rgba(214,138,95,.2)]">
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-ink">
                这一天暂时没有「{selectedSpecies.commonName}」实况。
              </p>
              <p className="mt-1.5 text-sm text-muted">换一天看看，或分享你在现场看到的样子。</p>
            </div>
            <SproutMark className="h-12 w-12 shrink-0" />
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
