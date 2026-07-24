// Step 1: capture. In-app camera viewfinder (getUserMedia) with a shutter, plus
// an album-selection entry. Camera captures use `now` + current geolocation;
// album uploads read EXIF for capture time (required) and GPS (falls back to
// geolocation, to be confirmed by the user in the detail step).
//
// Minimal styling — real design comes later.
import { useEffect, useRef, useState } from 'react'
import { useSetAtom } from 'jotai'

import type { CaptureMeta } from '#/lib/api'
import { getCurrentLngLat } from '#/lib/geolocation'
import { readCaptureMeta } from '#/lib/exif'
import { captureAtom, stepAtom } from '#/features/share/state'

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function CaptureStep() {
  const setCapture = useSetAtom(captureAtom)
  const setStep = useSetAtom(stepAtom)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setCameraReady(true)
        }
      } catch {
        if (!cancelled) setCameraError('无法访问相机，请检查权限或从相册选择。')
      }
    }

    void start()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  async function handleShutter() {
    const video = videoRef.current
    if (!video || !cameraReady || busy) return
    setBusy(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas 不可用')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)

      const coords = await getCurrentLngLat()
      const meta: CaptureMeta = {
        source: 'camera',
        capturedAt: new Date().toISOString(),
        coords,
        coordsSource: coords ? 'geolocation' : 'none',
      }
      setCapture({ dataUrl, meta })
      setStep('recognize')
    } finally {
      setBusy(false)
    }
  }

  async function handleAlbum(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same file
    if (!file || busy) return
    setBusy(true)
    setNotice(null)
    try {
      const exif = await readCaptureMeta(file)
      // Reject images without a capture time — they can't be trusted as current.
      if (!exif.capturedAt) {
        setNotice('该图片缺少拍摄时间信息，无法用于发布，请换一张由相机拍摄的照片。')
        return
      }
      const dataUrl = await readFileAsDataUrl(file)
      const coords = exif.coords ?? (await getCurrentLngLat())
      const meta: CaptureMeta = {
        source: 'album',
        capturedAt: exif.capturedAt,
        coords,
        coordsSource: exif.coords ? 'exif' : coords ? 'geolocation' : 'none',
      }
      setCapture({ dataUrl, meta })
      setStep('recognize')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">
            {cameraError}
          </div>
        )}
      </div>

      {notice && <p className="bg-amber-100 px-4 py-2 text-sm text-amber-900">{notice}</p>}

      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <label className="cursor-pointer text-sm text-gray-700 underline">
          从相册选择
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAlbum}
            disabled={busy}
          />
        </label>

        <button
          type="button"
          onClick={handleShutter}
          disabled={!cameraReady || busy}
          aria-label="拍照"
          className="h-16 w-16 rounded-full border-4 border-gray-400 bg-white disabled:opacity-40"
        />

        <span className="w-16" />
      </div>
    </div>
  )
}
