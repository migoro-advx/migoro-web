import { lazy } from 'react'
import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { Show } from '@clerk/tanstack-react-start'

import { AuthOverlay } from '#/components/AuthOverlay'

// Camera / geolocation touch browser globals, so load the journey client-only
// (mirrors the MapTilerMap client-only convention).
const ShareJourney = lazy(() => import('#/features/share/ShareJourney'))

export const Route = createFileRoute('/share')({ component: SharePage })

function SharePage() {
  return (
    <ClientOnly fallback={null}>
      {/* Login gating: signed-in users get the journey; everyone else sees the
          same sign-in prompt used on the map, and proceeds once authenticated. */}
      <Show when="signed-in">
        <ShareJourney />
      </Show>
      <AuthOverlay />
    </ClientOnly>
  )
}
