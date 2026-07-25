import { lazy, Suspense, useEffect, useState } from 'react'
import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { useAtomValue, useSetAtom } from 'jotai'
import NumberFlow, { NumberFlowGroup } from '@number-flow/react'

import { AuthOverlay } from '#/components/AuthOverlay'
import BottomNav, { NAV_OFFSET } from '#/components/BottomNav'
import TimeDial from '#/components/TimeDial'
import { SproutMark } from '#/brand/illustrations'
import { chatOpenAtom } from '#/features/chat/state'
import { placeNameAtom, selectedDayAtom } from '#/features/sightings/state'
import { useSightings } from '#/features/sightings/useSightings'
import { queryOpenAtom, selectedSpeciesAtom } from '#/features/species/state'

const MapTilerMap = lazy(() => import('#/components/MapTilerMap'))
const ChatInvite = lazy(() => import('#/features/chat/ChatInvite'))
const SpeciesQuery = lazy(() => import('#/features/species/SpeciesQuery'))
const SightingsMarkers = lazy(() => import('#/features/sightings/SightingsMarkers'))
const PlacePanel = lazy(() => import('#/features/places/PlacePanel'))

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

function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="text-accent">
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

/** Whole days back from today (0 = today) for the dial's center label. */
function daysBackFrom(day: Date): number {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const picked = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  return Math.round((today.getTime() - picked.getTime()) / MS_PER_DAY)
}

function Home() {
  const selectedSpecies = useAtomValue(selectedSpeciesAtom)
  const setSpecies = useSetAtom(selectedSpeciesAtom)
  const queryOpen = useAtomValue(queryOpenAtom)
  const setQueryOpen = useSetAtom(queryOpenAtom)
  const chatOpen = useAtomValue(chatOpenAtom)
  const setChatOpen = useSetAtom(chatOpenAtom)
  const selectedDay = useAtomValue(selectedDayAtom)
  const setSelectedDay = useSetAtom(selectedDayAtom)
  const placeName = useAtomValue(placeNameAtom)

  const { count, isLoading } = useSightings()
  const showEmptyState = Boolean(selectedSpecies) && !isLoading && count === 0

  // NumberFlow only rolls while the same instance's `value` changes, but a
  // day switch swaps the SWR key and `count` collapses to 0 mid-flight, which
  // would unmount the instance. Hold the last settled count through loads so
  // the number rolls instead of flashing "暂无实况".
  const [settledCount, setSettledCount] = useState(count)
  useEffect(() => {
    if (!isLoading) setSettledCount(count)
  }, [isLoading, count])
  // Only bridge same-species loads (day/bbox changes) — a species switch must
  // not pair the new name with the old species' held count.
  useEffect(() => {
    setSettledCount(0)
  }, [selectedSpecies?.id])
  const displayCount = isLoading ? settledCount : count

  const daysBack = daysBackFrom(selectedDay)
  const subtitle = selectedSpecies ? (
    displayCount > 0 ? (
      <>
        {selectedSpecies.commonName} · <NumberFlow value={displayCount} suffix=" 条实况" />
      </>
    ) : (
      '暂无实况'
    )
  ) : undefined

  return (
    <div className="fixed inset-0">
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <MapTilerMap controlsBottomOffset={`calc(${NAV_OFFSET} + ${DIAL_REVEAL} + 0.75rem)`}>
            <SightingsMarkers />
          </MapTilerMap>
        </Suspense>
      </ClientOnly>

      {/* Top search field + 问问 AI + 定位胶囊. Mirrors the design's top bar
          enough to drive the species-query overlay and reflect the filter. */}
      <div className="fixed inset-x-0 top-0 z-40 px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-4 py-3 shadow-lg ring-1 ring-black/5">
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
                  className="t-fade-in text-sm font-medium text-accent"
                >
                  清除
                </button>
              )}
            </div>
            {/* Chat-invite entry — opens the Photon iMessage invite modal. */}
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-3 text-sm font-medium text-ink shadow-lg ring-1 ring-black/5 t-press"
            >
              <SparkIcon />
              问问 AI
            </button>
          </div>
          {placeName && (
            <div className="t-pop-in mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs text-ink shadow-md ring-1 ring-black/5">
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
          <div className="t-rise-in mx-auto flex w-full max-w-md items-center gap-3 rounded-3xl bg-peach px-6 py-5 shadow-[0_10px_30px_rgba(214,138,95,.2)]">
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-ink">
                这一天暂时没有“{selectedSpecies.commonName}”实况。
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
        label={
          // Numeric segments each get their own NumberFlow (suffix carries the
          // unit) so they roll as the dial changes days; the group keeps their
          // layout shifts in sync. 今天/昨天 are pure text — no digits to roll —
          // so that segment swaps in via key remount instead.
          <NumberFlowGroup>
            <span>
              {daysBack >= 2 ? (
                <NumberFlow value={daysBack} suffix=" 天前" />
              ) : (
                <span key={daysBack} className="t-swap-in">
                  {daysBack === 1 ? '昨天' : '今天'}
                </span>
              )}
              {' · '}
              <NumberFlow value={selectedDay.getMonth() + 1} suffix=" 月" />{' '}
              <NumberFlow value={selectedDay.getDate()} suffix=" 日" />
            </span>
          </NumberFlowGroup>
        }
        subtitle={subtitle}
      />

      <BottomNav />

      {queryOpen && (
        <Suspense fallback={null}>
          <SpeciesQuery />
        </Suspense>
      )}
      {chatOpen && (
        <Suspense fallback={null}>
          <ChatInvite />
        </Suspense>
      )}
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <PlacePanel />
        </Suspense>
      </ClientOnly>
      <AuthOverlay />
    </div>
  )
}
