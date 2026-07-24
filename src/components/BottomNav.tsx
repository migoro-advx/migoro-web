// Bottom navigation bar shown on the map home page and the species overlay.
// Behavior is unchanged from the labeled version: left = 地图 (current page,
// no-op), center = 拍摄 (opens /share), right = 我的 (inert placeholder). Only
// the appearance follows the mockup — two sage circular buttons flanking a
// raised orange floating action button.
import { Link } from '@tanstack/react-router'

/**
 * Height of the nav's content row (excludes the safe-area inset). Callers use
 * NAV_OFFSET to lift bottom-anchored UI (e.g. the TimeDial dome) above the bar.
 */
const NAV_CONTENT_HEIGHT = 60

/** CSS length from the viewport bottom to the top of the nav content row. */
export const NAV_OFFSET = `calc(${NAV_CONTENT_HEIGHT}px + env(safe-area-inset-bottom))`

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
        {/* 地图 — current page, no navigation. */}
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full bg-sage text-white"
          aria-label="地图"
        >
          <LocateIcon />
        </span>

        {/* 拍摄 — raised orange FAB opening the photo-share journey. */}
        <Link
          to="/share"
          aria-label="拍摄"
          className="absolute left-1/2 -top-3 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-accent-strong text-white"
        >
          <PlusIcon />
        </Link>

        {/* 我的 — inert placeholder until that section exists. */}
        <button
          type="button"
          disabled
          aria-label="我的"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-sage text-white"
        >
          <ProfileIcon />
        </button>
      </div>
    </nav>
  )
}
