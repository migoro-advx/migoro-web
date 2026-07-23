import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Bottom-anchored half-dial (dome) time selector for 見頃.
 *
 * A large circle is positioned so its center sits on the bottom edge of the
 * viewport — only the upper arc (a dome) is visible. Dragging along the dome
 * rotates it; a fixed pointer at the apex marks the selected day.
 *
 * The dial is bounded and non-looping: apex angle 0 = `maxDate` (now, future
 * locked) and the maximum rotation is capped (default 30 days back), so it
 * never wraps around. One minor tick = 1 day, one major tick = 1 week.
 */

const DEG_PER_DAY = 2.4
const RADIUS = 760
const DEFAULT_DAYS_BACK = 30
const DEFAULT_REVEAL_HEIGHT = '200px'
const MS_PER_DAY = 86_400_000
const MIN_ANGLE = 0

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/** Days between two dates, ignoring intra-day time (positive when `later` is newer). */
function daysBetween(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / MS_PER_DAY)
}

function formatLabel(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export interface TimeDialProps {
  /** Controlled selected date. */
  value?: Date
  /** Initial selected date (uncontrolled). Defaults to `maxDate`. */
  defaultValue?: Date
  /** Fired when the snapped day changes. */
  onChange?: (date: Date) => void
  /** Latest selectable date (future is locked). Defaults to now. */
  maxDate?: Date
  /** How many days back the dial can reach. Defaults to 30. */
  maxDaysBack?: number
  /**
   * Explicit override for the maximum rotation angle (degrees). Defaults to
   * `maxDaysBack * DEG_PER_DAY`. Lets callers cap the drag range for later use.
   */
  maxAngleDeg?: number
  /**
   * How much of the dome is visible above the bottom edge. Any CSS length
   * (e.g. '200px', '25%', '24svh'). Larger = more of the arc shows.
   */
  revealHeight?: string
}

export default function TimeDial({
  value,
  defaultValue,
  onChange,
  maxDate,
  maxDaysBack = DEFAULT_DAYS_BACK,
  maxAngleDeg,
  revealHeight = DEFAULT_REVEAL_HEIGHT,
}: TimeDialProps) {
  // Seed "now" once so the reference date is stable across renders. Date-driven
  // output (labels, onChange) is gated behind `mounted` to avoid SSR mismatch.
  const [now] = useState(() => maxDate ?? new Date())
  const [mounted, setMounted] = useState(false)

  const maxAngle = maxAngleDeg ?? maxDaysBack * DEG_PER_DAY

  const initialAngle = (() => {
    const seed = value ?? defaultValue
    if (!seed) return MIN_ANGLE
    return clamp(daysBetween(now, seed) * DEG_PER_DAY, MIN_ANGLE, maxAngle)
  })()

  const [rotation, setRotation] = useState(initialAngle)

  const wheelRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const lastAngleRef = useRef(0)
  const draggingRef = useRef(false)
  const snapRafRef = useRef<number | null>(null)
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const emittedDaysRef = useRef<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Keep rotation in sync when used as a controlled component.
  useEffect(() => {
    if (!value || draggingRef.current) return
    setRotation(clamp(daysBetween(now, value) * DEG_PER_DAY, MIN_ANGLE, maxAngle))
  }, [value, now, maxAngle])

  // Emit onChange when the selected day changes (after mount only).
  useEffect(() => {
    if (!mounted) return
    const daysBack = Math.round(rotation / DEG_PER_DAY)
    if (emittedDaysRef.current === daysBack) return
    emittedDaysRef.current = daysBack
    onChange?.(new Date(now.getTime() - daysBack * MS_PER_DAY))
  }, [rotation, mounted, now, onChange])

  const cancelSnap = useCallback(() => {
    if (snapRafRef.current !== null) {
      cancelAnimationFrame(snapRafRef.current)
      snapRafRef.current = null
    }
  }, [])

  const snap = useCallback(() => {
    cancelSnap()
    const target = clamp(
      Math.round(rotation / DEG_PER_DAY) * DEG_PER_DAY,
      MIN_ANGLE,
      maxAngle,
    )
    const from = rotation
    const start = performance.now()
    const duration = 220
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const ease = 1 - (1 - p) ** 3
      setRotation(from + (target - from) * ease)
      snapRafRef.current = p < 1 ? requestAnimationFrame(step) : null
    }
    snapRafRef.current = requestAnimationFrame(step)
  }, [rotation, maxAngle, cancelSnap])

  const pointerAngle = useCallback((clientX: number, clientY: number) => {
    const { x, y } = centerRef.current
    return (Math.atan2(clientY - y, clientX - x) * 180) / Math.PI
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = wheelRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      // The square rotates about its center, so the bounding-box center is a
      // stable rotation origin even though the center sits off-screen.
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      }
      draggingRef.current = true
      el.setPointerCapture(e.pointerId)
      lastAngleRef.current = pointerAngle(e.clientX, e.clientY)
      cancelSnap()
    },
    [pointerAngle, cancelSnap],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return
      const angle = pointerAngle(e.clientX, e.clientY)
      let delta = angle - lastAngleRef.current
      if (delta > 180) delta -= 360
      if (delta < -180) delta += 360
      lastAngleRef.current = angle
      setRotation(prev => clamp(prev + delta, MIN_ANGLE, maxAngle))
    },
    [pointerAngle, maxAngle],
  )

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return
    draggingRef.current = false
    snap()
  }, [snap])

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      cancelSnap()
      setRotation(prev => clamp(prev + (e.deltaY + e.deltaX) * 0.04, MIN_ANGLE, maxAngle))
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
      wheelTimerRef.current = setTimeout(snap, 140)
    },
    [maxAngle, snap, cancelSnap],
  )

  useEffect(
    () => () => {
      cancelSnap()
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
    },
    [cancelSnap],
  )

  const days = Array.from({ length: maxDaysBack + 1 }, (_, d) => d)

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40"
      style={{ height: revealHeight }}
    >
      {/* Fixed apex pointer — does not rotate with the wheel. */}
      <div
        className="absolute left-1/2 top-0 z-10 -translate-x-1/2"
        aria-hidden
        style={{
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '13px solid #e5484d',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.3))',
        }}
      >
        <span
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: 12, width: 2, height: 18, borderRadius: 1, background: '#e5484d' }}
        />
      </div>

      {/* Rotating dome (visual only). */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 rounded-full bg-white/90"
        aria-hidden
        style={{
          width: RADIUS * 2,
          height: RADIUS * 2,
          transform: `translate(-50%, calc(${2 * RADIUS}px - ${revealHeight})) rotate(${rotation}deg)`,
          boxShadow:
            '0 -8px 32px rgba(60,50,40,.14), inset 0 3px 10px rgba(255,255,255,.9), inset 0 -2px 8px rgba(0,0,0,.06)',
        }}
      >
        {days.map(d => {
          const base = -d * DEG_PER_DAY
          const major = d % 7 === 0
          const labelDate = new Date(now.getTime() - d * MS_PER_DAY)
          return (
            <div
              key={d}
              className="absolute inset-0"
              style={{ transform: `rotate(${base}deg)` }}
              aria-hidden
            >
              <span
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  top: 14,
                  width: major ? 2 : 1,
                  height: major ? 16 : 8,
                  background: major ? 'rgba(50,35,35,.75)' : 'rgba(60,45,45,.4)',
                }}
              />
              {major && mounted && (
                <span
                  className="absolute left-1/2 text-[11px] font-semibold tracking-wide whitespace-nowrap text-stone-600"
                  style={{
                    top: 36,
                    // Counter-rotate to keep the label upright on screen.
                    transform: `translateX(-50%) rotate(${-(rotation + base)}deg)`,
                  }}
                >
                  {formatLabel(labelDate)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Circular interaction layer — clip-path constrains hit-testing to the
          dome's circle so drags outside the arc fall through to the map. */}
      <div
        ref={wheelRef}
        className="pointer-events-auto absolute bottom-0 left-1/2 touch-none select-none"
        aria-hidden
        style={{
          width: RADIUS * 2,
          height: RADIUS * 2,
          transform: `translate(-50%, calc(${2 * RADIUS}px - ${revealHeight}))`,
          clipPath: 'circle(50%)',
          cursor: draggingRef.current ? 'grabbing' : 'grab',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={handleWheel}
      />
    </div>
  )
}
