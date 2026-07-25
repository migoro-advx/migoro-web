// Step 1: capture. In-app camera viewfinder (getUserMedia) with a shutter, plus
// an album-selection entry. Camera captures use `now` + current geolocation;
// album uploads read EXIF for capture time (required) and GPS (falls back to
// geolocation, to be confirmed by the user in the location step).
//
// Layout mirrors the "AI拍照" design: black frame, a celadon viewfinder card,
// and a shutter | 相册 bottom bar. Camera parameter controls (flash, exposure,
// focal length, etc.) are intentionally omitted — the web platform can't drive
// them reliably across devices. The ✕ close is a minimal placeholder to be
// restyled later.
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

  useEffect(() => {
    let cancelled = false
    setCameraReady(false)

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
    <div className="t-slide-in flex h-full flex-col bg-black text-white">
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

      {/* Bottom bar: shutter (center) | 相册 (right), per the design mock. */}
      <div className="px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="grid grid-cols-3 items-center mb-12">
          <span aria-hidden />

          <button
            type="button"
            onClick={handleShutter}
            disabled={!cameraReady || busy}
            aria-label="拍照"
            className="justify-self-center rounded-full border-4 border-white bg-transparent p-1 t-press [--press-scale:0.9] disabled:opacity-40"
          >
            <span className="block h-14 w-14 rounded-full bg-white" />
          </button>

          <label className="cursor-pointer justify-self-end" aria-label="从相册选择">
            <span className="flex h-16 w-16 items-center justify-center text-white t-press">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
                <path
                  d="M30.8185 30.2727C30.927 30.2727 31.031 30.2296 31.1077 30.1529C31.1845 30.0762 31.2276 29.9721 31.2276 29.8636V6.13634C31.2276 6.02784 31.1845 5.92379 31.1077 5.84707C31.031 5.77035 30.927 5.72725 30.8185 5.72725H5.45482C5.4011 5.72725 5.3479 5.73783 5.29827 5.75839C5.24864 5.77895 5.20354 5.80908 5.16555 5.84707C5.12756 5.88506 5.09743 5.93016 5.07687 5.97979C5.05631 6.02942 5.04573 6.08262 5.04573 6.13634V29.8636C5.04573 29.9173 5.05631 29.9705 5.07687 30.0202C5.09743 30.0698 5.12756 30.1149 5.16555 30.1529C5.20354 30.1909 5.24864 30.221 5.29827 30.2416C5.3479 30.2621 5.4011 30.2727 5.45482 30.2727H30.8185ZM30.8185 32.7273H5.45482C5.07876 32.7273 4.70639 32.6532 4.35896 32.5093C4.01152 32.3654 3.69584 32.1544 3.42993 31.8885C3.16401 31.6226 2.95308 31.3069 2.80917 30.9595C2.66526 30.612 2.59119 30.2397 2.59119 29.8636V6.13634C2.59119 5.76028 2.66526 5.38791 2.80917 5.04048C2.95308 4.69304 3.16401 4.37736 3.42993 4.11144C3.69584 3.84553 4.01152 3.6346 4.35896 3.49069C4.70639 3.34678 5.07876 3.27271 5.45482 3.27271H30.8185C31.1945 3.27271 31.5669 3.34678 31.9143 3.49069C32.2618 3.6346 32.5774 3.84553 32.8434 4.11144C33.1093 4.37736 33.3202 4.69304 33.4641 5.04048C33.608 5.38791 33.6821 5.76028 33.6821 6.13634V29.8636C33.6821 30.2397 33.608 30.612 33.4641 30.9595C33.3202 31.3069 33.1093 31.6226 32.8434 31.8885C32.5774 32.1544 32.2618 32.3654 31.9143 32.5093C31.5669 32.6532 31.1945 32.7273 30.8185 32.7273Z"
                  fill="currentColor"
                />
                <path
                  d="M4.54419 24.6166L2.88492 22.8084L9.30356 16.92C9.85158 16.4171 10.5738 16.1472 11.3173 16.1673C12.0608 16.1875 12.7673 16.4961 13.2873 17.028L18.8656 22.7348C18.9386 22.8095 19.0374 22.8535 19.1417 22.8578C19.2461 22.8621 19.3481 22.8262 19.4269 22.7577L22.7365 19.8818C23.2634 19.4239 23.9395 19.1743 24.6375 19.1799C25.3356 19.1855 26.0075 19.4459 26.5271 19.9121L33.264 25.9576L31.6252 27.7846L24.8875 21.7382C24.8133 21.6719 24.7174 21.6348 24.6178 21.6341C24.5183 21.6333 24.4219 21.6689 24.3466 21.7341L21.0371 24.6101C20.4858 25.0893 19.7721 25.3397 19.0422 25.3101C18.3123 25.2804 17.6213 24.9729 17.1106 24.4505L11.5315 18.7437C11.4572 18.6678 11.3564 18.6238 11.2503 18.6209C11.1442 18.618 11.0411 18.6565 10.9628 18.7281L4.54419 24.6166Z"
                  fill="currentColor"
                />
                <path
                  d="M22.0909 11.8636C22.0909 12.4061 22.3064 12.9263 22.69 13.3099C23.0736 13.6935 23.5939 13.909 24.1364 13.909C24.6789 13.909 25.1991 13.6935 25.5827 13.3099C25.9663 12.9263 26.1818 12.4061 26.1818 11.8636C26.1818 11.3211 25.9663 10.8008 25.5827 10.4172C25.1991 10.0336 24.6789 9.81812 24.1364 9.81812C23.5939 9.81812 23.0736 10.0336 22.69 10.4172C22.3064 10.8008 22.0909 11.3211 22.0909 11.8636Z"
                  fill="currentColor"
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
        </div>
        <p className="mt-4 text-center text-xs text-white/50">拍摄时将记录设备时间与位置</p>
      </div>
    </div>
  )
}
