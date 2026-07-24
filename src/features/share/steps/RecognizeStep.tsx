// Step 2: automatic recognition. Shows the captured image and loads candidate
// species via useSWR. Tapping a candidate confirms the species (per the product
// spec, the user confirms the model's suggestion); the user may also skip and
// pick later in the detail step.
//
// Minimal styling — real design comes later.
import { useAtomValue, useSetAtom } from 'jotai'

import type { RecognitionCandidate } from '#/lib/api'
import { captureAtom, selectedSpeciesAtom, stepAtom } from '#/features/share/state'
import { useRecognition } from '#/features/share/useRecognition'

export default function RecognizeStep() {
  const capture = useAtomValue(captureAtom)
  const setSelectedSpecies = useSetAtom(selectedSpeciesAtom)
  const setStep = useSetAtom(stepAtom)
  const { candidates, isLoading, error, retry } = useRecognition(capture?.dataUrl ?? null)

  function confirm(candidate: RecognitionCandidate | null) {
    setSelectedSpecies(candidate?.species ?? null)
    setStep('detail')
  }

  return (
    <div className="flex h-full flex-col">
      {capture && (
        <img src={capture.dataUrl} alt="所拍照片" className="h-56 w-full object-cover" />
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="mb-3 text-base font-medium text-gray-900">识别到的物种</h2>

        {isLoading && <p className="text-sm text-gray-500">识别中…</p>}

        {error && (
          <div className="text-sm text-gray-700">
            <p>识别失败。</p>
            <button type="button" onClick={retry} className="mt-2 underline">
              重试
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <ul className="flex flex-col gap-2">
            {candidates.map(candidate => (
              <li key={candidate.species.id}>
                <button
                  type="button"
                  onClick={() => confirm(candidate)}
                  className="flex w-full items-center justify-between rounded border border-gray-300 px-4 py-3 text-left"
                >
                  <span>
                    <span className="text-gray-900">{candidate.species.commonName}</span>
                    <span className="ml-2 text-xs text-gray-500 italic">
                      {candidate.species.scientificName}
                    </span>
                  </span>
                  <span className="text-xs text-gray-500">
                    {Math.round(candidate.confidence * 100)}%
                  </span>
                </button>
              </li>
            ))}
            {candidates.length === 0 && <p className="text-sm text-gray-500">未识别到候选物种。</p>}
          </ul>
        )}
      </div>

      <div className="border-t border-gray-200 px-4 py-3">
        <button
          type="button"
          onClick={() => confirm(null)}
          className="w-full rounded border border-gray-300 px-4 py-2.5 text-gray-700"
        >
          跳过，稍后手动选择
        </button>
      </div>
    </div>
  )
}
