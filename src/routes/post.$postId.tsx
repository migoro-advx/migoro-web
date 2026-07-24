// 帖子详情 — a single post's full view, shared by every entry point (map,
// place waterfall, 个人主页). Deep-linkable by id alone.
//
// Layout follows the 我的帖子详情 mockup: a top bar (back / title / 编辑), the
// photo hero, a white species card with a solid stage pill, and a peach
// 实况记录 card of label/value rows. 编辑 renders only when the signed-in user
// authored the post, and is an inert placeholder for now.
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useUser } from '@clerk/tanstack-react-start'
import useSWR from 'swr'

import { api, POST_STATUS_LABEL } from '#/lib/api'
import { fullDate } from '#/features/places/format'

export const Route = createFileRoute('/post/$postId')({
  component: PostDetail,
})

/** 时间来源 trust copy — how the capture timestamp was obtained. */
const TIME_SOURCE_LABEL = { onsite: '现场拍摄 · 设备时间', album: '相册 · 照片时间' } as const

function PostDetail() {
  const { postId } = Route.useParams()
  const router = useRouter()
  const navigate = useNavigate()
  const { user } = useUser()

  const { data: post, error, isLoading } = useSWR(['post', postId], () => api.getPost(postId))

  const isAuthor = Boolean(user?.id && post?.authorId && user.id === post.authorId)
  const locationText =
    post?.locationName ?? [post?.place.parkName, post?.place.areaName].filter(Boolean).join(' · ')

  return (
    <div className="fixed inset-0 flex flex-col overflow-y-auto bg-white">
      <div className="mx-auto w-full max-w-md px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+1rem)]">
        {/* Top bar — back / centered title / 编辑 (author only). */}
        <div className="relative flex h-11 items-center justify-between">
          <button
            type="button"
            aria-label="返回"
            onClick={() =>
              router.history.canGoBack() ? router.history.back() : navigate({ to: '/' })
            }
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-2xl text-ink"
          >
            <span aria-hidden>‹</span>
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-ink">
            帖子详情
          </h1>
          {isAuthor && (
            // TODO: 后端用户侧编辑接口就绪后接入（目前 PUT 仅在管理端）。
            <button type="button" disabled className="text-sm font-semibold text-accent">
              编辑
            </button>
          )}
        </div>

        {error ? (
          // The public endpoint 404s for hidden/deleted posts reached from /me.
          <p className="mt-8 text-sm text-muted">帖子不存在或已删除。</p>
        ) : isLoading || !post ? (
          <p className="mt-8 text-sm text-muted">加载中…</p>
        ) : (
          <>
            {/* Hero — the post photo over a brand placeholder background. */}
            <div className="mt-3 aspect-[4/5] w-full overflow-hidden rounded-3xl bg-celadon">
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt={post.species.commonName}
                  className="h-full w-full object-cover"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              )}
            </div>

            {/* Species card — name + status, solid stage pill on the right. */}
            <div className="mt-5 flex items-center gap-3 rounded-3xl bg-white px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,.08)] ring-1 ring-black/5">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-bold text-ink">{post.species.commonName}</h2>
                <p className="mt-0.5 text-sm text-muted">
                  {POST_STATUS_LABEL[post.status ?? 'PUBLISHED']}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-accent-strong px-3.5 py-1.5 text-sm font-semibold text-white">
                {post.bloomStage}
              </span>
            </div>

            {/* 实况记录 — trust metadata as label/value rows. */}
            <div className="mt-4 rounded-3xl bg-peach px-5 py-5">
              <h3 className="text-base font-bold text-ink">实况记录</h3>
              <dl className="mt-3 space-y-3">
                <RecordRow label="拍摄于" value={fullDate(new Date(post.capturedAt))} />
                {locationText && <RecordRow label="具体点位" value={locationText} />}
                <RecordRow label="时间来源" value={TIME_SOURCE_LABEL[post.timeSource]} />
                <RecordRow label="发布于" value={fullDate(new Date(post.publishedAt))} />
              </dl>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function RecordRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink">{value}</dd>
    </div>
  )
}
