import { lazy } from 'react'
import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { Show } from '@clerk/tanstack-react-start'

import { AuthOverlay } from '#/components/AuthOverlay'

// The location step touches the MapTiler SDK, so load the journey client-only
// (mirrors the share route). `$postId_` opts out of nesting under the detail
// route, which renders no Outlet.
const EditJourney = lazy(() => import('#/features/share/EditJourney'))

export const Route = createFileRoute('/post/$postId_/edit')({ component: EditPage })

function EditPage() {
  const { postId } = Route.useParams()
  return (
    <ClientOnly fallback={null}>
      {/* Login gating: editing is author-only, so it requires a session; the
          journey itself re-checks authorship once the post loads. */}
      <Show when="signed-in">
        <EditJourney postId={postId} />
      </Show>
      <AuthOverlay />
    </ClientOnly>
  )
}
