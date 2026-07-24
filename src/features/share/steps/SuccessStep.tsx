// Step 5: publish result ("发布成功"). Terminal screen shown after a successful
// createPost. Summarizes what was published and offers next actions. 查看地图 /
// 查看帖子 leave the journey (back to the map); 继续拍摄 resets to a fresh
// capture. The "其他结果状态" note is presentational (审核/同步 states are a
// backend concern not yet modeled).
import { useAtomValue } from 'jotai'

import { BloomMark } from '#/brand/illustrations'
import { captureAtom, formAtom, selectedSpeciesAtom, useResetShare } from '#/features/share/state'

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
  const resetShare = useResetShare()

  const locationSummary = [form.locationName, form.areaName].filter(Boolean).join(' · ')

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white px-5 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      {/* Avatar with flower mark. */}
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-peach">
        <BloomMark className="h-12 w-12" />
      </span>

      {/* Orange success check. */}
      <span className="mt-5 text-2xl text-accent" aria-hidden>
        ✓
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
          onClick={onClose}
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

      {/* Presentational: other result states. */}
      <div className="mt-6 rounded-2xl bg-white px-4 py-4 ring-1 ring-black/5">
        <p className="text-xs text-muted">其他结果状态</p>
        <p className="mt-1 text-sm text-ink">审核中 · 待同步 · 仅保存到个人历史</p>
      </div>
    </div>
  )
}
