import { lazy, Suspense, useState } from 'react'
import { ClientOnly, Link, createFileRoute } from '@tanstack/react-router'
import { useAtomValue, useSetAtom } from 'jotai'

import { AuthOverlay } from '#/components/AuthOverlay'
import TimeDial from '#/components/TimeDial'
import { queryOpenAtom, selectedSpeciesAtom } from '#/features/species/state'

const MapTilerMap = lazy(() => import('#/components/MapTilerMap'))
const SpeciesQuery = lazy(() => import('#/features/species/SpeciesQuery'))

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  // Selected time is kept as internal state for now; no downstream consumer yet.
  const [, setSelected] = useState<Date | null>(null)

  const selectedSpecies = useAtomValue(selectedSpeciesAtom)
  const setSpecies = useSetAtom(selectedSpeciesAtom)
  const queryOpen = useAtomValue(queryOpenAtom)
  const setQueryOpen = useSetAtom(queryOpenAtom)

  return (
    <div className="fixed inset-0">
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <MapTilerMap />
        </Suspense>
      </ClientOnly>
      {/* Species-query entry. Broader map-page styling is out of scope; this
          box mirrors the design's top search field only enough to drive the
          query overlay and reflect the current filter. */}
      <div className="fixed inset-x-0 top-0 z-40 px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="mx-auto flex w-full max-w-md items-center gap-2 rounded-full bg-white px-4 py-3 shadow-lg ring-1 ring-black/5">
          <span aria-hidden className="text-neutral-400">
            ⌕
          </span>
          <button
            type="button"
            onClick={() => setQueryOpen(true)}
            className="flex-1 text-left text-sm text-neutral-800"
          >
            {selectedSpecies ? selectedSpecies.commonName : <span className="text-neutral-400">查哪一种花？</span>}
          </button>
          {selectedSpecies && (
            <button
              type="button"
              onClick={() => setSpecies(null)}
              className="text-sm text-orange-500"
            >
              清除
            </button>
          )}
        </div>
      </div>
      <TimeDial onChange={setSelected} />
      {/* Minimal photo-share entry, bottom-right to clear the TimeDial dome.
          Styling is intentionally plain; the real design comes later. */}
      <Link
        to="/share"
        aria-label="拍照分享"
        className="fixed right-5 bottom-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-lg ring-1 ring-black/10"
      >
        <span aria-hidden>+</span>
      </Link>
      {queryOpen && (
        <Suspense fallback={null}>
          <SpeciesQuery />
        </Suspense>
      )}
      <AuthOverlay />
    </div>
  )
}
