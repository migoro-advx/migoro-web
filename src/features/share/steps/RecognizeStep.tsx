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

const PEACH = '#f7d9c9'

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
        <h1 className="text-3xl font-bold text-neutral-900">确认物种</h1>
        <p className="mt-1 text-sm text-neutral-400">AI只提供候选，需要你亲自确认</p>

        {/* Captured photo. */}
        <div
          className="mt-5 aspect-[16/10] w-full overflow-hidden rounded-3xl"
          style={{ backgroundColor: PEACH }}
        >
          {capture && (
            <img src={capture.dataUrl} alt="所拍照片" className="h-full w-full object-cover" />
          )}
        </div>

        {isLoading && <p className="mt-6 text-sm text-neutral-400">识别中…</p>}

        {error && (
          <div className="mt-6 text-sm text-neutral-700">
            <p>识别失败。</p>
            <button type="button" onClick={retry} className="mt-2 text-orange-500 underline">
              重试
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* Primary candidate. */}
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-neutral-100 px-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-neutral-900">
                  可能是：{chosen ? chosen.commonName : '未识别'}
                </p>
                <p className="mt-1 text-xs text-neutral-400">点击后标记为“用户确认”</p>
              </div>
              <button
                type="button"
                onClick={() => proceed(chosen ?? null)}
                className="shrink-0 rounded-full bg-neutral-900 px-5 py-2 text-sm text-white"
              >
                确认
              </button>
            </div>

            {/* Other candidates + manual re-pick. */}
            <h2 className="mt-6 text-base font-bold text-neutral-900">其他候选</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {others.map(candidate => (
                <button
                  key={candidate.species.id}
                  type="button"
                  onClick={() =>
                    setChosenIndex(candidates.findIndex(c => c.species.id === candidate.species.id))
                  }
                  className="rounded-full bg-neutral-100 px-4 py-2 text-sm text-neutral-700"
                >
                  {candidate.species.commonName}
                </button>
              ))}
              <button
                type="button"
                onClick={() => proceed(null)}
                className="rounded-full bg-neutral-100 px-4 py-2 text-sm text-neutral-700"
              >
                重新选择
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-neutral-100 px-4 py-4 text-center text-xs text-neutral-400">
              低置信/识别失败：补拍花朵、叶片或手动选择
            </div>
          </>
        )}

        <div className="mt-4 rounded-2xl bg-[#e7ede4] px-4 py-4 text-xs leading-relaxed text-neutral-600">
          物种识别仅供观赏情报标注参考，
          <br />
          请勿据此判断可食用性、药用或接触安全。
        </div>
      </div>

      {/* Bottom actions: 重拍 | 继续. */}
      <div className="flex items-center gap-3 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <button
          type="button"
          onClick={() => setStep('capture')}
          className="rounded-full bg-neutral-100 px-6 py-3 text-sm text-neutral-700"
        >
          重拍
        </button>
        <button
          type="button"
          onClick={() => proceed(chosen ?? null)}
          className="rounded-full bg-neutral-900 px-8 py-3 text-sm text-white"
        >
          继续
        </button>
      </div>
    </div>
  )
}
