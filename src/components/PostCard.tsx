// Shared 2-column waterfall post card — an id-seeded palette strip over the
// photo (brand celadon placeholder underneath), then species name + capture
// line. Used by the place waterfall and the profile page; the latter appends a
// status line via `statusLine`.
import type { ReactNode } from 'react'

import type { Post } from '#/lib/api'
import { hourMinute, relativeDay } from '#/features/places/format'

// Card strip palette — picked deterministically from the post id so a post
// keeps its color across every tab/page it appears on.
const STRIP_COLORS = [
  'var(--color-peach)',
  'var(--color-peach-tick)',
  'var(--color-sage-soft)',
] as const

function stripColorFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return STRIP_COLORS[h % STRIP_COLORS.length]
}

export default function PostCard({
  post,
  speciesName,
  statusLine,
  index,
  onOpen,
}: {
  post: Post
  speciesName: string
  /** Optional third text row, e.g. “已发布 · 梧桐公园” on the profile page. */
  statusLine?: ReactNode
  /** Grid position driving the staggered entrance (capped at 8 internally). */
  index?: number
  onOpen: () => void
}) {
  const captured = new Date(post.capturedAt)
  // Han–digit spacing: "拍摄于 3 天前" needs a joining space, "拍摄于今天" doesn't.
  const capturedDay = relativeDay(captured)
  const capturedDayGap = /^\d/.test(capturedDay) ? ' ' : ''
  return (
    <button
      type="button"
      onClick={onOpen}
      style={index != null ? ({ '--i': Math.min(index, 8) } as React.CSSProperties) : undefined}
      className={`flex flex-col text-left t-press [--press-scale:0.98] ${
        index != null ? 't-stagger-item' : ''
      }`}
    >
      <div className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_24px_rgba(0,0,0,.08)] ring-1 ring-black/5">
        {/* Id-seeded palette strip + photo over the brand placeholder. */}
        <div className="h-2 w-full" style={{ backgroundColor: stripColorFor(post.id) }} />
        <div className="aspect-[4/3] w-full bg-celadon">
          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt={speciesName}
              loading="lazy"
              className="t-img-reveal h-full w-full object-cover"
              onLoad={e => e.currentTarget.classList.add('is-loaded')}
              onError={e => (e.currentTarget.style.display = 'none')}
            />
          )}
        </div>
      </div>
      <span className="mt-2 px-1 text-base font-semibold text-ink">{speciesName}</span>
      <span className="px-1 text-xs text-muted">
        {post.bloomStage} · 拍摄于{capturedDayGap}
        {capturedDay} {hourMinute(captured)}
      </span>
      {statusLine != null && <span className="px-1 text-xs">{statusLine}</span>}
    </button>
  )
}
