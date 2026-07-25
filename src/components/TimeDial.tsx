import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { COLORS } from '#/brand'

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
const DEFAULT_REVEAL_HEIGHT = '240px'
const MS_PER_DAY = 86_400_000
const MIN_ANGLE = 0

// Physics tuning for the "real dial" feel (units: degrees, seconds).
const FRICTION = 3.2 // fling velocity decays as v *= exp(-FRICTION * dt)
const DETENT_ENGAGE_SPEED = DEG_PER_DAY * 8 // below this the detent spring engages
const DETENT_STIFFNESS = 220
const DETENT_DAMPING = 2 * Math.sqrt(DETENT_STIFFNESS) // critical: no overshoot
const BOUNDARY_STIFFNESS = 320
const BOUNDARY_DAMPING = 2 * Math.sqrt(BOUNDARY_STIFFNESS)
const RUBBER_FACTOR = 0.35 // damping applied to the overshoot while dragging past a bound
const DRAG_DETENT_BIAS = 0.12 // slow-drag magnetic pull toward the nearest day
const SETTLE_SPEED = 0.6 // deg/s — settle threshold
const SETTLE_DIST = 0.15 // deg — settle threshold
const MAX_DT = 0.032 // clamp per-frame step to avoid jumps after dropped frames
const WHEEL_VELOCITY_K = 0.12 // wheel delta -> injected angular velocity

// Dial palette (shared tokens; see src/brand). White dome body, peach is only a
// thin rim ring, salmon radial ticks, orange apex pointer.
const DIAL_PEACH = COLORS.peachRim // outer arc band (light orange)
const DIAL_CORE = '#ffffff' // white dome body (peach is only a rim ring)
const DIAL_TICK = COLORS.peachTick // salmon radial ticks
const DIAL_ACCENT = COLORS.accent // apex pointer (orange)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Local start-of-day (00:00) for a Date, so day math ignores time-of-day. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Days between two dates, ignoring intra-day time (positive when `later` is newer). */
function daysBetween(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / MS_PER_DAY)
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
  /**
   * Prominent center label above the ticks (e.g. "今天 · 7 月 23 日"). Rendered
   * only after mount to avoid SSR/hydration mismatch on date-driven text.
   */
  label?: ReactNode
  /** Secondary line under the label (e.g. "紫花鼠尾草 · 18 条实况" / "暂无实况"). */
  subtitle?: ReactNode
  /**
   * Distance from the viewport bottom (any CSS length). Lets callers lift the
   * dome above a bottom nav. Defaults to 0.
   */
  bottomOffset?: string
}

export default function TimeDial({
  value,
  defaultValue,
  onChange,
  maxDate,
  maxDaysBack = DEFAULT_DAYS_BACK,
  maxAngleDeg,
  revealHeight = DEFAULT_REVEAL_HEIGHT,
  label,
  subtitle,
  bottomOffset = '0px',
}: TimeDialProps) {
  // Seed "now" once so the reference date is stable across renders, normalized
  // to local midnight so day math is calendar-day based (a raw timestamp past
  // noon would round a midnight `value` to 1 day back — opening on yesterday).
  // Date-driven output (labels, onChange) is gated behind `mounted` to avoid
  // SSR mismatch.
  const [now] = useState(() => startOfDay(maxDate ?? new Date()))
  const [mounted, setMounted] = useState(false)

  const maxAngle = maxAngleDeg ?? maxDaysBack * DEG_PER_DAY

  // The apex angle is date-derived (depends on `now` = new Date()), so it can
  // differ between the SSR render and client hydration. Start every render at
  // MIN_ANGLE and apply the real angle after mount (see the mount effect) so the
  // dome's rotate transform can't cause a hydration mismatch.
  const [rotation, setRotation] = useState(MIN_ANGLE)

  const wheelRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const lastAngleRef = useRef(0)
  const draggingRef = useRef(false)
  const emittedDaysRef = useRef<number | null>(null)

  // Physics state (mutable, read/written every frame without re-rendering).
  const rotationRef = useRef(MIN_ANGLE) // float mirror of `rotation`
  const velocityRef = useRef(0) // deg/s
  const lastMoveTsRef = useRef(0) // timestamp of the last pointer move
  const animatingRef = useRef(false) // physics loop running?
  const rafRef = useRef<number | null>(null)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    setMounted(true)
    // Now on the client: apply the real, date-derived starting angle (SSR and
    // the first client render stayed at MIN_ANGLE to avoid a hydration mismatch
    // on the dome's rotate transform). Later `value` changes are handled by the
    // controlled-sync effect below.
    const seed = value ?? defaultValue
    if (seed && !draggingRef.current && !animatingRef.current) {
      const a = clamp(daysBetween(now, seed) * DEG_PER_DAY, MIN_ANGLE, maxAngle)
      rotationRef.current = a
      setRotation(a)
    }
  }, [])

  // Track the user's reduced-motion preference (skip inertia when set).
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = mq.matches
    const onChangeMq = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches
    }
    mq.addEventListener('change', onChangeMq)
    return () => mq.removeEventListener('change', onChangeMq)
  }, [])

  // Keep rotation in sync when used as a controlled component (but never
  // interrupt an active drag or a running physics animation).
  useEffect(() => {
    if (!value || draggingRef.current || animatingRef.current) return
    const a = clamp(daysBetween(now, value) * DEG_PER_DAY, MIN_ANGLE, maxAngle)
    rotationRef.current = a
    setRotation(a)
  }, [value, now, maxAngle])

  // Emit onChange when the selected day changes (after mount only).
  useEffect(() => {
    if (!mounted) return
    const daysBack = Math.round(rotation / DEG_PER_DAY)
    if (emittedDaysRef.current === daysBack) return
    emittedDaysRef.current = daysBack
    // Calendar arithmetic (not fixed 24h multiples) so DST transitions inside
    // the window can't shift the emitted date off its midnight.
    onChange?.(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack))
  }, [rotation, mounted, now, onChange])

  const nearestDetent = useCallback(
    (a: number) => clamp(Math.round(a / DEG_PER_DAY) * DEG_PER_DAY, MIN_ANGLE, maxAngle),
    [maxAngle],
  )

  const stopPhysics = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    animatingRef.current = false
  }, [])

  const settleTo = useCallback(
    (angle: number) => {
      const a = nearestDetent(angle)
      rotationRef.current = a
      velocityRef.current = 0
      setRotation(a)
    },
    [nearestDetent],
  )

  // Unified physics loop: fling (friction) -> detent spring (magnetic snap),
  // with a stiffer spring pulling back inside the bounds (rubber-band return).
  const startPhysics = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (reducedMotionRef.current) {
      settleTo(rotationRef.current)
      return
    }
    animatingRef.current = true
    let last = performance.now()
    const step = (t: number) => {
      const dt = Math.min(MAX_DT, (t - last) / 1000)
      last = t
      let rot = rotationRef.current
      let v = velocityRef.current

      if (rot < MIN_ANGLE || rot > maxAngle) {
        // Out of bounds: strong spring pulls back to the nearest edge.
        const target = clamp(rot, MIN_ANGLE, maxAngle)
        v += (-BOUNDARY_STIFFNESS * (rot - target) - BOUNDARY_DAMPING * v) * dt
      } else if (Math.abs(v) >= DETENT_ENGAGE_SPEED) {
        // Fast fling: coast, decaying by friction and gliding over detents.
        v *= Math.exp(-FRICTION * dt)
      } else {
        // Slow: detent spring magnetically settles onto the nearest day.
        const target = nearestDetent(rot)
        v += (-DETENT_STIFFNESS * (rot - target) - DETENT_DAMPING * v) * dt
      }

      rot += v * dt
      rotationRef.current = rot
      velocityRef.current = v
      setRotation(rot)

      const inBounds = rot >= MIN_ANGLE && rot <= maxAngle
      if (
        inBounds &&
        Math.abs(v) < SETTLE_SPEED &&
        Math.abs(rot - nearestDetent(rot)) < SETTLE_DIST
      ) {
        settleTo(rot)
        rafRef.current = null
        animatingRef.current = false
        return
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }, [maxAngle, nearestDetent, settleTo])

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
      lastMoveTsRef.current = performance.now()
      velocityRef.current = 0
      stopPhysics()
    },
    [pointerAngle, stopPhysics],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return
      const t = performance.now()
      const angle = pointerAngle(e.clientX, e.clientY)
      let delta = angle - lastAngleRef.current
      if (delta > 180) delta -= 360
      if (delta < -180) delta += 360
      lastAngleRef.current = angle

      const dt = Math.max(0.001, (t - lastMoveTsRef.current) / 1000)
      lastMoveTsRef.current = t

      // Smoothed instantaneous speed feeds the release fling.
      const instV = delta / dt
      velocityRef.current = velocityRef.current * 0.6 + instV * 0.4

      let next = rotationRef.current + delta
      // Rubber-band: only the overshoot past a bound is damped.
      if (next < MIN_ANGLE) next = MIN_ANGLE + (next - MIN_ANGLE) * RUBBER_FACTOR
      else if (next > maxAngle) next = maxAngle + (next - maxAngle) * RUBBER_FACTOR

      // Subtle per-day magnetic bias while dragging slowly; fades out with speed.
      const speedFade = Math.max(0, 1 - Math.abs(instV) / DETENT_ENGAGE_SPEED)
      if (speedFade > 0 && next >= MIN_ANGLE && next <= maxAngle) {
        next += DRAG_DETENT_BIAS * speedFade * (nearestDetent(next) - next)
      }

      rotationRef.current = next
      setRotation(next)
    },
    [pointerAngle, maxAngle, nearestDetent],
  )

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return
    draggingRef.current = false
    // A pause before releasing means no fling.
    if (performance.now() - lastMoveTsRef.current > 80) velocityRef.current = 0
    startPhysics()
  }, [startPhysics])

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      // Inject angular velocity and let the shared physics loop settle it.
      velocityRef.current += (e.deltaY + e.deltaX) * WHEEL_VELOCITY_K
      startPhysics()
    },
    [startPhysics],
  )

  useEffect(() => () => stopPhysics(), [stopPhysics])

  const days = Array.from({ length: maxDaysBack + 1 }, (_, d) => d)

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40"
      style={{ height: revealHeight, bottom: bottomOffset }}
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
          borderTop: `13px solid ${DIAL_ACCENT}`,
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.3))',
        }}
      >
        <span
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: 12, width: 2, height: 18, borderRadius: 1, background: DIAL_ACCENT }}
        />
      </div>

      {/* Center readout — day label + sighting subtitle + dial hint. The dome
          no longer draws per-tick date labels, so this sits alone in the clear
          zone below the tick band as one balanced group. Gated behind `mounted`
          to keep date-driven text off the SSR output. */}
      {mounted && (label || subtitle) && (
        <div
          className="pointer-events-none absolute left-1/2 z-20 flex -translate-x-1/2 flex-col items-center text-center"
          style={{ top: 80 }}
        >
          {label && (
            <div className="text-2xl leading-tight font-bold tracking-tight whitespace-nowrap text-neutral-900">
              {label}
            </div>
          )}
          {subtitle && (
            <div className="mt-1.5 text-sm whitespace-nowrap text-neutral-500">{subtitle}</div>
          )}
          <div className="mt-3 text-[11px] tracking-wide whitespace-nowrap text-neutral-400">
            最近 {maxDaysBack} 天 · 每 7 天为一周
          </div>
        </div>
      )}

      {/* Rotating dome (visual only). */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 rounded-full"
        aria-hidden
        style={{
          width: RADIUS * 2,
          height: RADIUS * 2,
          transform: `translate(-50%, calc(${2 * RADIUS}px - ${revealHeight})) rotate(${rotation}deg)`,
          background: `radial-gradient(circle at center, ${DIAL_CORE} 0 92%, ${DIAL_PEACH} 96% 100%)`,
          boxShadow:
            '0 -8px 32px rgba(214,138,95,.22), inset 0 3px 10px rgba(255,255,255,.9), inset 0 -2px 8px rgba(0,0,0,.06)',
        }}
      >
        {days.map(d => {
          const base = -d * DEG_PER_DAY
          const major = d % 7 === 0
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
                  width: major ? 3 : 2,
                  height: major ? 15 : 9,
                  borderRadius: major ? 1.5 : 1,
                  background: major ? DIAL_TICK : 'rgba(221,138,95,.55)',
                }}
              />
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
