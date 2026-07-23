import { lazy, Suspense } from 'react'
import { ClientOnly, createFileRoute } from '@tanstack/react-router'

const MapTilerMap = lazy(() => import('#/components/MapTilerMap'))

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="fixed inset-0">
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <MapTilerMap />
        </Suspense>
      </ClientOnly>
    </div>
  )
}
