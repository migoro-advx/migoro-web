// Half-screen place panel (地点半屏 Panel). A bottom sheet over the map, opened
// by tapping a marker/cluster (see SightingsMarkers). Reads the tapped place via
// `activePlaceIdAtom` and aggregates it for the current selected day + species
// filter. Follows the AuthOverlay convention: no dark backdrop.
//
// Client-only: only rendered after a client-side marker tap, so no fetch or
// date math runs during SSR.
import { useAtom, useAtomValue } from 'jotai'
import { useNavigate } from '@tanstack/react-router'
import useSWR from 'swr'

import { NAV_FAB_CLEARANCE } from '#/components/BottomNav'
import { SproutMark } from '#/brand/illustrations'
import { api } from '#/lib/api'
import { bboxCenter, distanceKm } from '#/lib/geo'
import { dayKey, mapBoundsAtom, selectedDayAtom } from '#/features/sightings/state'
import { selectedSpeciesAtom } from '#/features/species/state'
import { activePlaceIdAtom } from './state'
import { formatDistance, monthDay } from './format'

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="text-muted">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function PlacePanel() {
  const [placeId, setPlaceId] = useAtom(activePlaceIdAtom)
  const selectedDay = useAtomValue(selectedDayAtom)
  const species = useAtomValue(selectedSpeciesAtom)
  const bounds = useAtomValue(mapBoundsAtom)
  const navigate = useNavigate()

  const date = dayKey(selectedDay)
  const speciesId = species?.id

  const { data, isLoading } = useSWR(
    placeId ? ['placeSummary', placeId, date, speciesId ?? 'all'] : null,
    () =>
      api.getPlaceSummary({
        placeId: placeId as string,
        date,
        speciesId,
        bbox: bounds ?? undefined,
      }),
  )

  if (!placeId) return null

  const place = data?.place
  const headline = data?.headline
  const distance =
    place && bounds ? formatDistance(distanceKm(bboxCenter(bounds), place.coords)) : null
  const dateLabel = headline ? monthDay(new Date(headline.capturedAt)) : monthDay(selectedDay)
  const thumbCount = Math.min(4, Math.max(1, data?.count ?? 4))

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4"
      style={{ paddingBottom: `calc(${NAV_FAB_CLEARANCE} + 0.5rem)` }}
    >
      <div className="pointer-events-auto mx-auto w-full max-w-md rounded-3xl bg-white px-5 pt-3 pb-5 shadow-[0_-8px_30px_rgba(0,0,0,.12)] ring-1 ring-black/5">
        {/* Grabber — tap to dismiss the sheet. */}
        <button
          type="button"
          onClick={() => setPlaceId(null)}
          aria-label="收起"
          className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-black/10"
        />

        {isLoading || !place || !headline ? (
          <p className="py-6 text-center text-sm text-muted">加载中…</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl font-bold text-ink">
                {[place.parkName, place.areaName].filter(Boolean).join(' · ')}
              </h2>
              <SproutMark className="h-8 w-8 shrink-0" />
            </div>

            <p className="mt-1 text-sm text-muted">
              {[distance, headline.species.commonName, dateLabel].filter(Boolean).join(' · ')}
            </p>

            <div className="mt-3 inline-flex items-center rounded-full bg-peach px-3 py-1.5 text-sm">
              <span className="text-muted">观赏状态</span>
              <span className="ml-1 font-semibold text-accent">{headline.bloomStage}</span>
            </div>

            {/* Thumbnail row — recent post photos over brand placeholder blocks. */}
            <div className="mt-4 grid grid-cols-4 gap-2.5">
              {Array.from({ length: thumbCount }).map((_, i) => {
                const thumb = data.recentPosts.at(i)
                return (
                  <div key={i} className="aspect-square overflow-hidden rounded-2xl bg-celadon">
                    {thumb?.imageUrl && (
                      <img
                        src={thumb.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {place.sensitive && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-peach px-4 py-2.5 text-xs text-accent">
                <SproutMark className="h-4 w-4 shrink-0" />
                敏感区域将只显示大致位置
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                navigate({
                  to: '/place/$placeId',
                  params: { placeId },
                  search: { date, ...(speciesId ? { species: speciesId } : {}) },
                })
              }
              className="mt-5 flex w-full items-center justify-center rounded-full bg-ink py-4 text-sm font-semibold text-white"
            >
              查看更多实况
              <span className="ml-1">
                <ChevronRight />
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
