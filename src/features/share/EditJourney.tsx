// Post-edit journey: reuses the share journey's DetailStep + LocationStep in
// 'edit' mode. Loads the post, verifies authorship, seeds the shared journey
// atoms once, and renders only the two editable steps — no capture/recognize,
// and no success step (saving navigates straight back to the detail page).
// Client-only (MapTiler SDK in the location step), loaded via ClientOnly +
// lazy from the route, mirroring ShareJourney.
import { useEffect, useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { useUser } from '@clerk/tanstack-react-start'
import useSWR from 'swr'

import { api } from '#/lib/api'
import {
  captureAtom,
  formAtom,
  journeyModeAtom,
  locationEditedAtom,
  selectedSpeciesAtom,
  stepAtom,
  submitStateAtom,
  useResetShare,
} from '#/features/share/state'
import LocationStep from '#/features/share/steps/LocationStep'
import DetailStep from '#/features/share/steps/DetailStep'

export default function EditJourney({ postId }: { postId: string }) {
  const { user } = useUser()
  const step = useAtomValue(stepAtom)
  const setMode = useSetAtom(journeyModeAtom)
  const setCapture = useSetAtom(captureAtom)
  const setSelectedSpecies = useSetAtom(selectedSpeciesAtom)
  const setForm = useSetAtom(formAtom)
  const setLocationEdited = useSetAtom(locationEditedAtom)
  const setSubmitState = useSetAtom(submitStateAtom)
  const setStep = useSetAtom(stepAtom)
  const resetShare = useResetShare()
  const [seeded, setSeeded] = useState(false)

  // Same key as the detail page so both read one cache entry.
  const { data: post, error, isLoading } = useSWR(['post', postId], () => api.getPost(postId))

  const isAuthor = Boolean(user?.id && post?.authorId && user.id === post.authorId)

  // Seed the journey atoms once from the loaded post, then leave the steps in
  // charge. The whole journey is cleared again on unmount so a later 发布
  // visit starts from a clean slate.
  useEffect(() => {
    if (seeded || !post || !isAuthor) return
    setMode({ kind: 'edit', postId })
    setCapture({
      // Not a data URL in edit mode — the detail step's <img> accepts any URL,
      // and the photo is never re-uploaded (updatePost sends no file).
      dataUrl: post.imageUrl ?? '',
      meta: {
        source: post.timeSource === 'album' ? 'album' : 'camera',
        capturedAt: post.capturedAt,
        coords: post.place.coords,
        coordsSource: 'none',
      },
    })
    setSelectedSpecies(post.species)
    setForm({
      bloomStage: post.bloomStage,
      locationName: post.locationName ?? post.place.parkName,
      areaName: '',
      coords: post.place.coords,
    })
    // Treat the stored name as hand-confirmed: entering the location step must
    // not let reverse geocoding overwrite it.
    setLocationEdited(true)
    // An abandoned create journey (left via browser back, not its close
    // button) can leave an error/pending submit state behind — clear it.
    setSubmitState({ status: 'idle' })
    setStep('detail')
    setSeeded(true)
  }, [
    seeded,
    post,
    isAuthor,
    postId,
    setMode,
    setCapture,
    setSelectedSpecies,
    setForm,
    setLocationEdited,
    setSubmitState,
    setStep,
  ])

  useEffect(() => () => resetShare(), [resetShare])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {error ? (
        <p className="mt-8 px-5 text-sm text-muted">帖子不存在或已删除。</p>
      ) : isLoading || !post ? (
        <p className="t-shimmer mt-8 px-5 text-sm" data-text="加载中…">
          加载中…
        </p>
      ) : !isAuthor ? (
        <p className="mt-8 px-5 text-sm text-muted">只能编辑自己的帖子。</p>
      ) : !seeded ? null : (
        <>
          {step === 'location' && <LocationStep />}
          {step === 'detail' && <DetailStep />}
        </>
      )}
    </div>
  )
}
