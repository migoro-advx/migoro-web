// 地点实况瀑布流 — a 2-column grid of the posts at one place on the selected day,
// sorted by capture time (newest first). Reached from the place panel's
// "查看更多实况". Place + day + species come from the route params/search so the
// page is deep-linkable and mirrors the map's current filter context.
//
// Per the design alignment: no filter chips; strict selected-day scope; when a
// species filter is active only that species shows, otherwise all species. The
// mockup's multi-day labels are a mock artifact and are intentionally not
// replicated — every card belongs to the selected day.
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAtomValue } from 'jotai'
import useSWR from 'swr'

import BottomNav, { NAV_OFFSET } from '#/components/BottomNav'
import PostCard from '#/components/PostCard'
import { api } from '#/lib/api'
import { dayKey, mapBoundsAtom } from '#/features/sightings/state'

interface PlaceSearch {
  date: string
  species?: string
}

export const Route = createFileRoute('/place/$placeId')({
  validateSearch: (search: Record<string, unknown>): PlaceSearch => ({
    date: typeof search.date === 'string' ? search.date : dayKey(new Date()),
    ...(typeof search.species === 'string' ? { species: search.species } : {}),
  }),
  component: PlaceWaterfall,
})

function PlaceWaterfall() {
  const { placeId } = Route.useParams()
  const { date, species: speciesId } = Route.useSearch()
  const bounds = useAtomValue(mapBoundsAtom)
  const navigate = useNavigate()

  const { data: summary } = useSWR(['placeSummary', placeId, date, speciesId ?? 'all', 'wf'], () =>
    api.getPlaceSummary({ placeId, date, speciesId, bbox: bounds ?? undefined }),
  )
  const { data: posts, isLoading } = useSWR(['placePosts', placeId, date, speciesId ?? 'all'], () =>
    api.listPlacePosts({ placeId, date, speciesId, bbox: bounds ?? undefined }),
  )
  const { data: speciesList = [] } = useSWR('species:list', () => api.listSpecies(), {
    revalidateOnFocus: false,
  })

  const nameFor = (id: string) => speciesList.find(s => s.id === id)?.commonName ?? id
  const subtitle = speciesId ? nameFor(speciesId) : summary?.headline.species.commonName

  return (
    <div className="fixed inset-0 flex flex-col overflow-y-auto bg-white">
      <div
        className="mx-auto w-full max-w-md px-5 pt-[calc(env(safe-area-inset-top)+1rem)]"
        style={{ paddingBottom: `calc(${NAV_OFFSET} + 2rem)` }}
      >
        <Link
          to="/"
          aria-label="返回地图"
          className="-ml-2 mb-2 flex h-9 w-9 items-center justify-center rounded-full text-2xl text-muted"
        >
          <span aria-hidden>‹</span>
        </Link>

        <h1 className="text-3xl font-bold text-ink">{summary?.place.parkName ?? '地点'}</h1>
        <p className="mt-1 text-sm text-muted">
          {[summary?.place.areaName, subtitle].filter(Boolean).join(' · ')}
        </p>

        {isLoading ? (
          <p className="mt-8 text-sm text-muted">加载中…</p>
        ) : !posts || posts.length === 0 ? (
          <p className="mt-8 text-sm text-muted">这一天暂时没有实况。</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                speciesName={nameFor(post.speciesId)}
                onOpen={() => navigate({ to: '/post/$postId', params: { postId: post.id } })}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
