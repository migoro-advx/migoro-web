// Step 2: automatic recognition. Shows the captured image and loads candidate
// species via useSWR. The user confirms the model's top suggestion (per the
// product spec, recognition is advisory — the user makes the final call). Other
// candidates can be swapped into the primary slot; "重新选择" defers the choice
// to the manual species field in the publish step.
//
// Layout mirrors the "确认物种" design.
import { useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'

import type { Species } from '#/lib/api'
import { captureAtom, selectedSpeciesAtom, stepAtom } from '#/features/share/state'
import { useRecognition } from '#/features/share/useRecognition'
import { BloomMark } from '#/brand/illustrations'

export default function RecognizeStep() {
  const capture = useAtomValue(captureAtom)
  const setSelectedSpecies = useSetAtom(selectedSpeciesAtom)
  const setStep = useSetAtom(stepAtom)
  const { candidates, isLoading, error, retry } = useRecognition(capture?.dataUrl ?? null)

  // Which candidate currently sits in the primary slot. Defaults to the top one.
  const [chosenIndex, setChosenIndex] = useState(0)
  const chosen: Species | undefined = candidates.at(chosenIndex)?.species
  const others = candidates.filter((_, i) => i !== chosenIndex)

  function proceed(species: Species | null) {
    setSelectedSpecies(species)
    setStep('location')
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
        <h1 className="text-3xl font-bold text-ink">确认物种</h1>
        <p className="mt-1 text-sm text-muted">AI只提供候选，需要你亲自确认</p>

        {/* Captured photo. */}
        <div className="mt-5 aspect-[16/10] w-full overflow-hidden rounded-3xl bg-celadon">
          {capture && (
            <img src={capture.dataUrl} alt="所拍照片" className="h-full w-full object-cover" />
          )}
        </div>

        {isLoading && <p className="mt-6 text-sm text-muted">识别中…</p>}

        {error && (
          <div className="mt-6 text-sm text-ink">
            <p>识别失败。</p>
            <button type="button" onClick={retry} className="mt-2 text-accent underline">
              重试
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* Primary candidate. */}
            <div className="mt-5 flex gap-2.5 rounded-3xl bg-peach px-3 py-3 relative">
              <div className="min-w-0 flex-1 bg-white rounded-2xl p-3 shadow-[0_8px_24px_rgba(21,21,21,.07)]">
                <p className="text-base font-bold text-ink">
                  可能是：{chosen ? chosen.commonName : '未识别'}
                </p>
                <p className="mt-1 text-xs text-muted">点击后标记为“用户确认”</p>
              </div>
              <button
                type="button"
                onClick={() => proceed(chosen ?? null)}
                className="shrink-0 rounded-2xl bg-accent py-2 text-sm text-white block w-18"
              >
                确认
              </button>
              <BloomMark className="absolute bottom-0 block right-25" />
            </div>

            {/* Other candidates + manual re-pick. */}
            <div className="mt-6 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">其他候选</h2>
              <button type="button" onClick={() => proceed(null)} className="text-sm text-muted">
                重新选择
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {others.map(candidate => (
                <button
                  key={candidate.species.id}
                  type="button"
                  onClick={() =>
                    setChosenIndex(candidates.findIndex(c => c.species.id === candidate.species.id))
                  }
                  className="rounded-full bg-sage px-4 py-2 text-sm text-white"
                >
                  {candidate.species.commonName}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-ink/5 px-4 py-4 text-center text-xs text-muted">
              低置信/识别失败：补拍花朵、叶片或手动选择
            </div>
          </>
        )}

        <div className="mt-4 rounded-2xl bg-celadon px-4 py-4 text-xs leading-relaxed text-ink">
          物种识别仅供观赏情报标注参考，
          <br />
          请勿据此判断可食用性、药用性或接触安全。
        </div>
      </div>

      {/* Bottom actions: 重拍 | 继续. */}
      <div className="grid grid-cols-2 gap-3 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <button
          type="button"
          onClick={() => setStep('capture')}
          className="col-span-1 w-full rounded-full bg-ink/5 py-3.5 text-sm text-ink"
        >
          重拍
        </button>
        <button
          type="button"
          onClick={() => proceed(chosen ?? null)}
          className="col-span-1 w-full rounded-full bg-ink py-3.5 text-sm text-white"
        >
          继续
        </button>
      </div>
    </div>
  )
}
