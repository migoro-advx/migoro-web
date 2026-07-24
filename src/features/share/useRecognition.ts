// Loads species recognition candidates for a captured image via useSWR. The
// captured image data URL is used as the cache key, so revisiting the same
// capture reuses the result; a new capture triggers a fresh recognition.
import useSWR from 'swr'

import { api } from '#/lib/api'
import type { RecognitionCandidate } from '#/lib/api'

export function useRecognition(image: string | null) {
  const { data, error, isLoading, mutate } = useSWR<RecognitionCandidate[]>(
    image ? ['recognize', image] : null,
    () => api.recognizeSpecies(image as string),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  return {
    candidates: data ?? [],
    isLoading,
    error: error as Error | undefined,
    retry: () => mutate(),
  }
}
