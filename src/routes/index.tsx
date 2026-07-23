import { lazy, Suspense, useState } from 'react'
import { ClientOnly, createFileRoute } from '@tanstack/react-router'

import { AuthOverlay } from '#/components/AuthOverlay'
import TimeDial from '#/components/TimeDial'

const MapTilerMap = lazy(() => import('#/components/MapTilerMap'))

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  // Selected time is kept as internal state for now; no downstream consumer yet.
  const [, setSelected] = useState<Date | null>(null)

  return (
    <div className="fixed inset-0">
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <MapTilerMap />
        </Suspense>
      </ClientOnly>
      <TimeDial onChange={setSelected} />
      <AuthOverlay />
    </div>
  )
}
