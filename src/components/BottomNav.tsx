// Bottom navigation bar shown on the map home page and the species overlay.
// Left = 地图 (back to the map), center = 拍摄 (opens /share), right = 我的
// (opens the profile page). The appearance follows the mockup — two sage
// circular buttons flanking a raised orange floating action button.
import { Link } from '@tanstack/react-router'

/**
 * Height of the nav's content row (excludes the safe-area inset). Callers use
 * NAV_OFFSET to lift bottom-anchored UI (e.g. the TimeDial dome) above the bar.
 */
const NAV_CONTENT_HEIGHT = 60

/** Padding below the content row — matches the `<nav>`'s `pb-6` (1.5rem). */
const NAV_BOTTOM_INSET = 24

/** How far the raised center FAB rises above the content row — matches `-top-3`. */
const FAB_OVERSHOOT = 12

/** CSS length from the viewport bottom to the top of the nav content row. */
export const NAV_OFFSET = `calc(${NAV_CONTENT_HEIGHT}px + env(safe-area-inset-bottom))`

/**
 * Full clearance from the viewport bottom to the top of the raised center FAB,
 * plus the device's bottom safe-area inset. Full-width bottom overlays (e.g. the
 * place panel) must clear this so they never overlap the nav bar, its protruding
 * 拍摄 button, or a home indicator.
 * = content row (60) + pb-6 (24) + FAB overshoot (12) + safe-area inset.
 */
export const NAV_FAB_CLEARANCE = `calc(${NAV_CONTENT_HEIGHT + NAV_BOTTOM_INSET + FAB_OVERSHOOT}px + env(safe-area-inset-bottom))`

/** Concentric crosshair — the 地图/定位 affordance. */
function LocateIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <path
        d="M12 3v3M12 18v3M3 12h3M18 12h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8.5" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 19a6.5 6.5 0 0 1 13 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 bg-white pb-6" aria-label="主导航">
      <div className="relative mx-auto flex h-[60px] max-w-md items-center justify-between px-10">
        {/* 地图 — back to the map home. */}
        <Link
          to="/"
          aria-label="地图"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-sage text-white transition-transform duration-150 active:scale-95"
        >
          <LocateIcon />
        </Link>

        {/* 拍摄 — raised orange FAB opening the photo-share journey. */}
        <Link
          to="/share"
          aria-label="拍摄"
          className="absolute left-1/2 -top-3 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-accent-strong text-white transition-transform duration-150 active:scale-95"
        >
          <PlusIcon />
        </Link>

        {/* 我的 — the login-gated profile page. */}
        <Link
          to="/me"
          aria-label="我的"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-sage text-white transition-transform duration-150 active:scale-95"
        >
          <ProfileIcon />
        </Link>
      </div>
    </nav>
  )
}
