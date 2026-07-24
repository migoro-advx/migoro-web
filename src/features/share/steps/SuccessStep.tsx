// Step 5: publish result ("发布成功"). Terminal screen shown after a successful
// createPost. Summarizes what was published and offers next actions. 查看地图
// leaves the journey (back to the map); 查看帖子 opens the freshly created
// post's detail page; 继续拍摄 resets to a fresh capture.
import { useAtomValue } from 'jotai'
import { useNavigate } from '@tanstack/react-router'

import { BloomMark } from '#/brand/illustrations'
import {
  captureAtom,
  formAtom,
  selectedSpeciesAtom,
  submitStateAtom,
  useResetShare,
} from '#/features/share/state'

function formatMonthDay(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** Month/day + time, e.g. "7月23日 09:41" — used in the result card. */
function formatMonthDayTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${formatMonthDay(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function SuccessStep({ onClose }: { onClose: () => void }) {
  const capture = useAtomValue(captureAtom)
  const species = useAtomValue(selectedSpeciesAtom)
  const form = useAtomValue(formAtom)
  const submitState = useAtomValue(submitStateAtom)
  const resetShare = useResetShare()
  const navigate = useNavigate()

  // Set by DetailStep on a successful createPost; always present on this screen.
  const postId = submitState.status === 'success' ? submitState.id : null

  const locationSummary = [form.locationName, form.areaName].filter(Boolean).join(' · ')

  function viewPost() {
    if (!postId) return onClose()
    resetShare()
    void navigate({ to: '/post/$postId', params: { postId } })
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white px-5 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] justify-end mb-10">
      {/* Avatar with flower mark. */}
      <span className="block h-20 w-20 rounded-full bg-peach">
        <BloomMark className="block scale-140 mt-[-15%] ml-[10%]" />
      </span>

      {/* Orange success check. */}
      <span className="my-8 text-2xl text-accent" aria-hidden>
        <svg width="25" height="19" viewBox="0 0 25 19" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 9.76776L2.87358 6.85795L8.7294 12.6172L21.3949 0L24.2926 2.9098L8.7294 18.4126L0 9.76776Z" fill="currentColor"/>
        </svg>
      </span>

      <h1 className="mt-3 text-3xl font-bold text-ink">实况发布成功</h1>
      {capture && (
        <p className="mt-2 text-sm text-muted">
          已加入 {formatMonthDay(capture.meta.capturedAt)} 的地图实况
        </p>
      )}

      {/* Result card. */}
      <div className="mt-6 flex items-center gap-4 rounded-3xl bg-white p-4 shadow-[0_2px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
        <span className="h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-celadon">
          {capture && (
            <img src={capture.dataUrl} alt="所拍照片" className="h-full w-full object-cover" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-ink">{species?.commonName ?? '未选择物种'}</p>
          {form.bloomStage && <p className="mt-1 text-sm text-accent">{form.bloomStage}</p>}
          {capture && (
            <p className="mt-1 text-sm text-muted">
              拍摄于 {formatMonthDayTime(capture.meta.capturedAt)}
            </p>
          )}
          {locationSummary && <p className="mt-1 text-sm text-muted">{locationSummary}</p>}
        </div>
      </div>

      {/* Next actions. */}
      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-full bg-ink px-6 py-3 text-sm text-white"
        >
          查看地图
        </button>
        <button
          type="button"
          onClick={viewPost}
          className="w-full rounded-full bg-ink/5 px-6 py-3 text-sm text-ink"
        >
          查看帖子
        </button>
        <button
          type="button"
          onClick={() => resetShare()}
          className="w-full rounded-full bg-ink/5 px-6 py-3 text-sm text-ink"
        >
          继续拍摄
        </button>
      </div>
    </div>
  )
}
