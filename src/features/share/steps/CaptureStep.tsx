// Step 1: capture. In-app camera viewfinder (getUserMedia) with a shutter, plus
// an album-selection entry. Camera captures use `now` + current geolocation;
// album uploads read EXIF for capture time (required) and GPS (falls back to
// geolocation, to be confirmed by the user in the location step).
//
// Layout mirrors the "AI拍照" design: black frame, a celadon viewfinder card,
// and a 相册 | shutter | flip bottom bar. Camera parameter controls (flash,
// exposure, focal length, etc.) are intentionally omitted — the web platform
// can't drive them reliably across devices. The camera-flip button toggles
// facingMode, which is well supported. The ✕ close is a minimal placeholder to
// be restyled later.
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

export default function CaptureStep({ onClose }: { onClose: () => void }) {
  const setCapture = useSetAtom(captureAtom)
  const setStep = useSetAtom(stepAtom)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')

  useEffect(() => {
    let cancelled = false
    setCameraReady(false)

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
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
  }, [facing])

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
    <div className="flex h-full flex-col bg-black text-white">
      {/* Top bar. Minimal ✕ close placeholder — to be restyled later. */}
      <div className="flex items-center px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
        <button type="button" onClick={onClose} aria-label="关闭" className="text-lg leading-none">
          ✕
        </button>
      </div>

      {/* Viewfinder card. */}
      <div className="flex flex-1 items-center px-5">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-celadon">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-ink">
              {cameraError}
            </div>
          ) : (
            <div className="absolute inset-x-0 bottom-6 flex justify-center">
              <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs text-white">
                请靠近主体 · 保持稳定
              </span>
            </div>
          )}
        </div>
      </div>

      {notice && (
        <p className="mx-5 mt-3 rounded-xl bg-peach px-4 py-2 text-sm text-ink">{notice}</p>
      )}

      {/* Bottom bar: 相册 | shutter | 翻转. */}
      <div className="px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="grid grid-cols-3 items-center">
          <label className="cursor-pointer justify-self-start">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-celadon text-ink">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="16"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <circle cx="8.5" cy="9" r="1.5" fill="currentColor" />
                <path
                  d="M4 18l4.5-5 3.5 3.5L15 13l5 5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
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
            className="justify-self-center rounded-full border-4 border-white bg-transparent p-1 disabled:opacity-40"
          >
            <span className="block h-14 w-14 rounded-full bg-white" />
          </button>

          <button
            type="button"
            onClick={() => setFacing(prev => (prev === 'environment' ? 'user' : 'environment'))}
            aria-label="翻转镜头"
            className="flex h-16 w-16 items-center justify-center justify-self-end rounded-2xl bg-ink text-white"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h5l1 1.5H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-white/50">拍摄时将记录设备时间与位置</p>
      </div>
    </div>
  )
}
