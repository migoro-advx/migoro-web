// Photo-share journey orchestrator. Full-screen, mobile-app style; switches
// between the three steps based on stepAtom. Client-only (camera / geolocation),
// so it's loaded via ClientOnly + lazy from the route.
//
// Minimal styling — real design comes later.
import { useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { useNavigate } from '@tanstack/react-router'

import { stepAtom, useResetShare } from '#/features/share/state'
import CaptureStep from '#/features/share/steps/CaptureStep'
import RecognizeStep from '#/features/share/steps/RecognizeStep'
import DetailStep from '#/features/share/steps/DetailStep'

const STEP_TITLE = {
  capture: '拍照',
  recognize: '识别物种',
  detail: '补充信息',
} as const

export default function ShareJourney() {
  const step = useAtomValue(stepAtom)
  const resetShare = useResetShare()
  const navigate = useNavigate()

  // Start every visit from a clean slate.
  useEffect(() => {
    resetShare()
  }, [resetShare])

  function close() {
    resetShare()
    void navigate({ to: '/' })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <button type="button" onClick={close} aria-label="关闭" className="text-sm text-gray-700">
          关闭
        </button>
        <h1 className="text-base font-medium text-gray-900">{STEP_TITLE[step]}</h1>
        <span className="w-8" />
      </header>

      <div className="min-h-0 flex-1">
        {step === 'capture' && <CaptureStep />}
        {step === 'recognize' && <RecognizeStep />}
        {step === 'detail' && <DetailStep onClose={close} />}
      </div>
    </div>
  )
}
