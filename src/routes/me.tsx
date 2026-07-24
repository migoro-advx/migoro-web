// 个人主页 — the signed-in user's own posts (我的帖子) across every status
// (已发布 / 已隐藏 / 已删除), newest first. Login-gated in place like /share:
// signed-out visitors see the AuthOverlay card and proceed once authenticated.
//
// Per the design alignment: no avatar/nickname header — only the 设置 action
// (opens Clerk's account modal). The mockup's 待同步/审核中/草稿 states are mock
// artifacts and are intentionally not replicated; only backend statuses show.
import { useState } from 'react'
import { ClientOnly, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Show, useClerk, useUser } from '@clerk/tanstack-react-start'
import useSWR from 'swr'
import NumberFlow from '@number-flow/react'

import { AuthOverlay } from '#/components/AuthOverlay'
import BottomNav, { NAV_OFFSET } from '#/components/BottomNav'
import PostCard from '#/components/PostCard'
import { POST_STATUS_LABEL, api } from '#/lib/api'
import type { Post } from '#/lib/api'

export const Route = createFileRoute('/me')({ component: MePage })

function MePage() {
  return (
    <ClientOnly fallback={null}>
      <Show when="signed-in">
        <MyPosts />
      </Show>
      <AuthOverlay />
    </ClientOnly>
  )
}

function MyPosts() {
  const { user } = useUser()
  const clerk = useClerk()
  const navigate = useNavigate()

  // `null` = 全部; otherwise a speciesId. Local state only — the filter is a
  // view refinement, not a shareable location.
  const [speciesFilter, setSpeciesFilter] = useState<string | null>(null)

  const userId = user?.id
  const { data: posts, isLoading } = useSWR(userId ? ['myPosts', userId] : null, () =>
    api.listMyPosts(userId!),
  )
  const { data: speciesList = [] } = useSWR('species:list', () => api.listSpecies(), {
    revalidateOnFocus: false,
  })

  const nameFor = (id: string) => speciesList.find(s => s.id === id)?.commonName ?? id

  // Species chips aggregated from the loaded posts, most-posted first.
  const counts = new Map<string, number>()
  for (const p of posts ?? []) counts.set(p.speciesId, (counts.get(p.speciesId) ?? 0) + 1)
  const chips = [...counts.entries()].sort((a, b) => b[1] - a[1])

  const visible = speciesFilter ? (posts ?? []).filter(p => p.speciesId === speciesFilter) : posts

  return (
    <div className="fixed inset-0 flex flex-col overflow-y-auto bg-white">
      <div
        className="mx-auto w-full max-w-md px-5 pt-[calc(env(safe-area-inset-top)+1rem)]"
        style={{ paddingBottom: `calc(${NAV_OFFSET} + 2rem)` }}
      >
        {/* 设置 — Clerk's account management modal (avatar / name / sign out). */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => clerk.openUserProfile()}
            className="py-2 text-sm text-muted"
          >
            设置
          </button>
        </div>

        {/* Species filter chips — 全部 + per-species counts. */}
        {(posts?.length ?? 0) > 0 && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            <FilterChip
              label={
                <>
                  全部 <NumberFlow value={posts!.length} />
                </>
              }
              active={speciesFilter === null}
              onSelect={() => setSpeciesFilter(null)}
            />
            {chips.map(([id, count]) => (
              <FilterChip
                key={id}
                label={
                  <>
                    {nameFor(id)} <NumberFlow value={count} />
                  </>
                }
                active={speciesFilter === id}
                onSelect={() => setSpeciesFilter(id)}
              />
            ))}
          </div>
        )}

        {isLoading || !posts ? (
          <p className="t-shimmer mt-8 text-sm" data-text="加载中…">
            加载中…
          </p>
        ) : posts.length === 0 ? (
          <p className="mt-8 text-sm text-muted">还没有发布过实况。</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {visible!.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                speciesName={nameFor(post.speciesId)}
                statusLine={<StatusLine post={post} />}
                index={i}
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

function FilterChip({
  label,
  active,
  onSelect,
}: {
  label: React.ReactNode
  active: boolean
  onSelect: () => void
}) {
  return (
    // The pop replays via class toggle: gaining .t-select-pop on selection
    // restarts the animation without remounting (keyboard focus survives).
    <button
      type="button"
      onClick={onSelect}
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150 ${
        active ? 't-select-pop bg-ink text-white' : 'bg-stone-100 text-ink'
      }`}
    >
      {label}
    </button>
  )
}

/** 「已发布 · 梧桐公园」— non-public states read in accent as a heads-up. */
function StatusLine({ post }: { post: Post }) {
  const label = post.status ? POST_STATUS_LABEL[post.status] : undefined
  const text = [label, post.locationName].filter(Boolean).join(' · ')
  if (!text) return null
  const isPublic = !post.status || post.status === 'PUBLISHED'
  return <span className={isPublic ? 'text-muted' : 'text-accent'}>{text}</span>
}
