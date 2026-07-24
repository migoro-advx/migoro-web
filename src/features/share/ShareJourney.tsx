// Photo-share journey orchestrator. Full-screen, mobile-app style; switches
// between the five steps based on stepAtom. Client-only (camera / geolocation /
// MapTiler SDK), so it's loaded via ClientOnly + lazy from the route.
//
// There is no shared chrome: each step owns its own title, background and
// close/back affordances (see the design mocks), so this component is just the
// full-screen container plus the step switch.
import { useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { useNavigate } from '@tanstack/react-router'

import { stepAtom, useResetShare } from '#/features/share/state'
import CaptureStep from '#/features/share/steps/CaptureStep'
import RecognizeStep from '#/features/share/steps/RecognizeStep'
import LocationStep from '#/features/share/steps/LocationStep'
import DetailStep from '#/features/share/steps/DetailStep'
import SuccessStep from '#/features/share/steps/SuccessStep'

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
      {step === 'capture' && <CaptureStep onClose={close} />}
      {step === 'recognize' && <RecognizeStep />}
      {step === 'location' && <LocationStep />}
      {step === 'detail' && <DetailStep />}
      {step === 'success' && <SuccessStep onClose={close} />}
    </div>
  )
}
