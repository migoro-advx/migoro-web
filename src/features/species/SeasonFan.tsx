// Swipeable fan carousel for the 当前花期 section. All in-season species sit on
// a large circle whose center is far below the section — dragging horizontally
// rotates the whole fan, release coasts with inertia and magnetically snaps
// onto a whole card. Tapping any visible card picks it directly (no need to
// center it first). Physics model mirrors TimeDial (friction fling, critically
// damped detent spring, boundary rubber-band, reduced-motion fallback).
import { useCallback, useEffect, useRef, useState } from 'react'

import { SpeciesFlower } from '#/brand/illustrations'
import type { Species } from '#/lib/api'

// Geometry (units: px, degrees). RADIUS is the virtual circle the cards ride
// on; DEG_PER_CARD is the angular pitch between neighbors, so the horizontal
// spacing is RADIUS * sin(DEG_PER_CARD) ≈ 119px — a slight overlap for the
// CARD_W-wide cards, matching the old static fan's stacked look. CARD_W is
// fixed (not viewport-relative) so the spacing/overlap ratio holds on any
// screen width.
const RADIUS = 760
const DEG_PER_CARD = 9
const CARD_W = 136
const PX_TO_CARDS = 180 / Math.PI / RADIUS / DEG_PER_CARD // horizontal drag px -> card units
const TAP_SLOP = 8 // px — movement below this is a tap; beyond it a drag starts

// Card emphasis, interpolated continuously by distance to the apex (px / scale).
const LIFT_CENTER = -10 // centered card rides high (same as the old raised card)
const LIFT_SIDE = 8
const SCALE_SIDE = 0.95

// Far cards fade out (opacity 1 -> 0 over [FADE_START, FADE_END] in card
// units) and go visibility:hidden past FADE_END — on wide screens the arc's
// tail would otherwise sprawl on forever and sink into the section below.
const FADE_START = 2
const FADE_END = 3

// Physics tuning (units: cards, seconds) — TimeDial's model in card units.
const FRICTION = 3.2 // fling velocity decays as v *= exp(-FRICTION * dt)
const DETENT_ENGAGE_SPEED = 2.5 // cards/s — below this the detent spring engages
const DETENT_STIFFNESS = 220
const DETENT_DAMPING = 2 * Math.sqrt(DETENT_STIFFNESS) // critical: no overshoot
const BOUNDARY_STIFFNESS = 320
const BOUNDARY_DAMPING = 2 * Math.sqrt(BOUNDARY_STIFFNESS)
const RUBBER_FACTOR = 0.35 // damping applied to the overshoot while dragging past a bound
const DRAG_DETENT_BIAS = 0.12 // slow-drag magnetic pull toward the nearest card
const SETTLE_SPEED = 0.06 // cards/s — settle threshold
const SETTLE_DIST = 0.02 // cards — settle threshold
const MAX_DT = 0.032 // clamp per-frame step to avoid jumps after dropped frames
const WHEEL_VELOCITY_K = 0.012 // wheel deltaX -> injected velocity (cards/s)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export default function SeasonFan({
  species,
  onPick,
}: {
  species: Species[]
  onPick: (s: Species) => void
}) {
  const total = species.length
  const maxOffset = total - 1

  // `offset` is the float scroll position in card units; card i sits at angle
  // (i - offset) * DEG_PER_CARD. Start on the middle card (mock shows the
  // middle raised).
  const [offset, setOffset] = useState(() => Math.floor((total - 1) / 2))

  const viewportRef = useRef<HTMLDivElement>(null)

  // Physics state (mutable, read/written every frame without re-rendering).
  const offsetRef = useRef(offset) // float mirror of `offset`
  const velocityRef = useRef(0) // cards/s
  const trackingRef = useRef(false) // pointer is down
  const draggedRef = useRef(false) // movement exceeded TAP_SLOP (suppresses click)
  const downPosRef = useRef({ x: 0, y: 0 })
  const lastXRef = useRef(0)
  const lastMoveTsRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const reducedMotionRef = useRef(false)

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

  const nearestDetent = useCallback((o: number) => clamp(Math.round(o), 0, maxOffset), [maxOffset])

  const stopPhysics = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const settleTo = useCallback(
    (o: number) => {
      const target = nearestDetent(o)
      offsetRef.current = target
      velocityRef.current = 0
      setOffset(target)
    },
    [nearestDetent],
  )

  // The search box can shrink the in-season list under the current offset —
  // clamp back inside instead of leaving the fan pointing past the last card.
  useEffect(() => {
    if (offsetRef.current > maxOffset) {
      stopPhysics()
      settleTo(maxOffset)
    }
  }, [maxOffset, stopPhysics, settleTo])

  // Unified physics loop: fling (friction) -> detent spring (magnetic snap),
  // with a stiffer spring pulling back inside the bounds (rubber-band return).
  const startPhysics = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (reducedMotionRef.current) {
      settleTo(offsetRef.current)
      return
    }
    let last = performance.now()
    const step = (t: number) => {
      const dt = Math.min(MAX_DT, (t - last) / 1000)
      last = t
      let o = offsetRef.current
      let v = velocityRef.current

      if (o < 0 || o > maxOffset) {
        // Out of bounds: strong spring pulls back to the nearest edge.
        const target = clamp(o, 0, maxOffset)
        v += (-BOUNDARY_STIFFNESS * (o - target) - BOUNDARY_DAMPING * v) * dt
      } else if (Math.abs(v) >= DETENT_ENGAGE_SPEED) {
        // Fast fling: coast, decaying by friction and gliding over detents.
        v *= Math.exp(-FRICTION * dt)
      } else {
        // Slow: detent spring magnetically settles onto the nearest card.
        const target = nearestDetent(o)
        v += (-DETENT_STIFFNESS * (o - target) - DETENT_DAMPING * v) * dt
      }

      o += v * dt
      offsetRef.current = o
      velocityRef.current = v
      setOffset(o)

      const inBounds = o >= 0 && o <= maxOffset
      if (inBounds && Math.abs(v) < SETTLE_SPEED && Math.abs(o - nearestDetent(o)) < SETTLE_DIST) {
        settleTo(o)
        rafRef.current = null
        return
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }, [maxOffset, nearestDetent, settleTo])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      trackingRef.current = true
      draggedRef.current = false
      downPosRef.current = { x: e.clientX, y: e.clientY }
      lastXRef.current = e.clientX
      lastMoveTsRef.current = performance.now()
      velocityRef.current = 0
      stopPhysics() // touching the fan halts a running fling
    },
    [stopPhysics],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!trackingRef.current) return

      if (!draggedRef.current) {
        // Not dragging yet: wait for horizontal intent past the tap slop.
        // Pointer capture is deferred until here so that a plain tap keeps its
        // native click semantics on the card button underneath.
        const dx = e.clientX - downPosRef.current.x
        const dy = e.clientY - downPosRef.current.y
        if (Math.abs(dx) < TAP_SLOP) return
        if (Math.abs(dx) < Math.abs(dy)) {
          // Vertical intent — hand the gesture to the page scroll (touch-action:
          // pan-y already lets the browser take it; just stop tracking).
          trackingRef.current = false
          return
        }
        draggedRef.current = true
        viewportRef.current?.setPointerCapture(e.pointerId)
        lastXRef.current = e.clientX
        lastMoveTsRef.current = performance.now()
        return
      }

      const t = performance.now()
      const deltaOffset = -(e.clientX - lastXRef.current) * PX_TO_CARDS
      lastXRef.current = e.clientX

      const dt = Math.max(0.001, (t - lastMoveTsRef.current) / 1000)
      lastMoveTsRef.current = t

      // Smoothed instantaneous speed feeds the release fling.
      const instV = deltaOffset / dt
      velocityRef.current = velocityRef.current * 0.6 + instV * 0.4

      let next = offsetRef.current + deltaOffset
      // Rubber-band: only the overshoot past a bound is damped.
      if (next < 0) next = next * RUBBER_FACTOR
      else if (next > maxOffset) next = maxOffset + (next - maxOffset) * RUBBER_FACTOR

      // Subtle per-card magnetic bias while dragging slowly; fades out with speed.
      const speedFade = Math.max(0, 1 - Math.abs(instV) / DETENT_ENGAGE_SPEED)
      if (speedFade > 0 && next >= 0 && next <= maxOffset) {
        next += DRAG_DETENT_BIAS * speedFade * (nearestDetent(next) - next)
      }

      offsetRef.current = next
      setOffset(next)
    },
    [maxOffset, nearestDetent],
  )

  const endDrag = useCallback(() => {
    if (!trackingRef.current) return
    trackingRef.current = false
    // A pause before releasing means no fling; a plain tap never flings.
    if (!draggedRef.current || performance.now() - lastMoveTsRef.current > 80) {
      velocityRef.current = 0
    }
    // The drag's synthetic click (if any) fires synchronously after pointerup,
    // so clear the suppression flag on the next tick — otherwise a later
    // keyboard Enter on a card would still be swallowed by onClickCapture.
    setTimeout(() => {
      draggedRef.current = false
    }, 0)
    // Always settle — covers a tap that halted a mid-flight fling between cards.
    startPhysics()
  }, [startPhysics])

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      // Horizontal wheel/trackpad only — deltaY stays with the page scroll
      // (unlike TimeDial's map screen, this page scrolls vertically).
      if (e.deltaX === 0) return
      velocityRef.current += e.deltaX * WHEEL_VELOCITY_K
      startPhysics()
    },
    [startPhysics],
  )

  useEffect(() => () => stopPhysics(), [stopPhysics])

  // Sizer: an invisible in-flow copy of the tallest card variant reserves the
  // viewport height (cards themselves are absolutely positioned on the arc).
  // pt-4 leaves room for the raised center card, pb-7 for the arc drop + shadow.
  const sizer = species.find(s => s.periodLabel) ?? species[0]

  return (
    <div
      ref={viewportRef}
      // Full-bleed: negative margins break out of the parent's px-6 / max-w-md
      // so the fan spans the whole viewport width. Clip horizontally only —
      // cards sinking along the arc (and their shadows) must stay uncut.
      className="relative mx-[calc(50%-50vw)] overflow-x-clip overflow-y-visible select-none"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={handleWheel}
      onDragStart={e => e.preventDefault()}
      onClickCapture={e => {
        // A drag ends with a synthetic click on the card under the pointer —
        // swallow it so releasing a swipe never picks a species.
        if (draggedRef.current) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      <div className="invisible mx-auto pt-4 pb-7" style={{ width: CARD_W }} aria-hidden>
        <div className="flex w-full flex-col p-2">
          <CardFace species={sizer} index={0} />
        </div>
      </div>

      {species.map((s, i) => {
        const dRaw = Math.abs(i - offset)
        const d = Math.min(1, dRaw)
        const angle = (i - offset) * DEG_PER_CARD
        const lift = LIFT_CENTER + (LIFT_SIDE - LIFT_CENTER) * d
        const scale = 1 + (SCALE_SIDE - 1) * d
        return (
          <div
            key={s.id}
            className="absolute top-4"
            style={{
              left: `calc(50% - ${CARD_W / 2}px)`,
              width: CARD_W,
              // Rotate rides the big circle (origin far below); lift/scale live
              // on the button so they pivot around the card itself.
              transform: `rotate(${angle}deg)`,
              transformOrigin: `50% ${RADIUS}px`,
              zIndex: 20 - Math.round(d * 10),
              opacity: clamp((FADE_END - dRaw) / (FADE_END - FADE_START), 0, 1),
              // Hidden (not unmounted) past the fade so the t-stagger-item
              // entrance never replays mid-swipe, and ghost cards can't be hit.
              visibility: dRaw > FADE_END ? 'hidden' : undefined,
            }}
          >
            <button
              type="button"
              onClick={() => onPick(s)}
              style={
                {
                  transform: `translateY(${lift}px) scale(${scale})`,
                  '--i': Math.min(i, 8),
                } as React.CSSProperties
              }
              className="t-stagger-item flex w-full flex-col rounded-3xl bg-white p-2 text-left shadow-[0_8px_24px_rgba(214,138,95,.18)] ring-1 ring-black/5 t-press"
            >
              <CardFace species={s} index={i} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/** Card contents, shared between the real cards and the invisible sizer. */
function CardFace({ species, index }: { species: Species; index: number }) {
  return (
    <>
      <span className="flex w-full items-center justify-center">
        <SpeciesFlower index={index} className="block w-full" />
      </span>
      <span className="mt-2 px-1 text-sm font-semibold text-ink">{species.commonName}</span>
      {species.periodLabel && (
        <span className="px-1 pb-1 text-xs text-muted">{species.periodLabel}</span>
      )}
    </>
  )
}
