// 帖子详情 — a single post's full view. Reached from the waterfall grid. The
// post carries its own place + species (see mockApi.getPost), so no search
// params are needed and the page is deep-linkable by id alone.
//
// Photos are brand placeholder blocks (no external requests). The mockup's
// decorative orange scrollbar is intentionally not replicated.
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import useSWR from 'swr'

import BottomNav, { NAV_OFFSET } from '#/components/BottomNav'
import { api } from '#/lib/api'
import { BLOOM_STAGE_COLOR } from '#/features/sightings/markers'
import { dayKey } from '#/features/sightings/state'
import { hourMinute, monthDay, relativeDay } from '#/features/places/format'

export const Route = createFileRoute('/post/$postId')({
  component: PostDetail,
})

const TIME_SOURCE_LABEL = { onsite: '现场拍摄', album: '相册' } as const

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="text-muted">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function PostDetail() {
  const { postId } = Route.useParams()
  const navigate = useNavigate()

  const { data: post, isLoading } = useSWR(['post', postId], () => api.getPost(postId))

  return (
    <div className="fixed inset-0 flex flex-col overflow-y-auto bg-white">
      <div
        className="mx-auto w-full max-w-md px-5 pt-[calc(env(safe-area-inset-top)+1rem)]"
        style={{ paddingBottom: `calc(${NAV_OFFSET} + 2rem)` }}
      >
        <Link
          to="/"
          aria-label="返回地图"
          className="-ml-2 mb-3 flex h-9 w-9 items-center justify-center rounded-full text-2xl text-muted"
        >
          <span aria-hidden>‹</span>
        </Link>

        {isLoading || !post ? (
          <p className="mt-8 text-sm text-muted">加载中…</p>
        ) : (
          <>
            {/* Hero — brand placeholder block. */}
            <div className="aspect-[4/5] w-full overflow-hidden rounded-3xl bg-celadon" />

            <div className="mt-5 flex items-center gap-3">
              <h1 className="text-2xl font-bold text-ink">{post.species.commonName}</h1>
              <span className="inline-flex items-center rounded-full bg-peach px-3 py-1 text-sm font-semibold text-accent">
                <span
                  className="mr-1.5 h-2 w-2 rounded-full"
                  style={{ backgroundColor: BLOOM_STAGE_COLOR[post.bloomStage] }}
                />
                {post.bloomStage}
              </span>
            </div>

            <p className="mt-3 text-sm text-muted">
              拍摄于 {monthDay(new Date(post.capturedAt))} {hourMinute(new Date(post.capturedAt))}
            </p>
            <p className="mt-1 text-sm text-muted">
              发布于 {relativeDay(new Date(post.publishedAt))} · 时间来源：
              {TIME_SOURCE_LABEL[post.timeSource]}
            </p>

            {post.description && (
              <p className="mt-4 text-base leading-relaxed text-ink">{post.description}</p>
            )}

            {/* Location card — taps back to the place waterfall. */}
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: '/place/$placeId',
                  params: { placeId: post.place.id },
                  search: {
                    date: dayKey(new Date(post.capturedAt)),
                    species: post.speciesId,
                  },
                })
              }
              className="mt-6 flex w-full items-center gap-3 rounded-3xl bg-white px-4 py-3.5 text-left shadow-[0_8px_24px_rgba(0,0,0,.08)] ring-1 ring-black/5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-ink">
                  {post.place.parkName} · {post.place.areaName}
                </p>
                <p className="mt-0.5 text-xs text-muted">具体点位 · 返回地图查看</p>
              </div>
              <ChevronRight />
            </button>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
