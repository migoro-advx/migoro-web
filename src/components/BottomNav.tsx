// Bottom navigation bar shown on the map home page: 地图 / 拍摄 / 我的.
// 地图 is the active tab, 拍摄 opens the photo-share journey (/share), and 我的
// is an inert placeholder until that section exists.
import { Link } from '@tanstack/react-router'

/**
 * Height of the nav's content row (excludes the safe-area inset). Callers use
 * NAV_OFFSET to lift bottom-anchored UI (e.g. the TimeDial dome) above the bar.
 */
const NAV_CONTENT_HEIGHT = 60

/** CSS length from the viewport bottom to the top of the nav content row. */
export const NAV_OFFSET = `calc(${NAV_CONTENT_HEIGHT}px + env(safe-area-inset-bottom))`

function MapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h1.7l1-1.6a1 1 0 0 1 .84-.46h4.92a1 1 0 0 1 .84.46l1 1.6h1.7A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.8" />
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

export default function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-black/5 bg-white pb-[env(safe-area-inset-bottom)]"
      aria-label="主导航"
    >
      <div className="mx-auto flex h-[60px] max-w-md items-stretch justify-around px-6">
        <span className="flex flex-1 flex-col items-center justify-center gap-1 text-neutral-900">
          <MapIcon />
          <span className="text-[11px] font-medium">地图</span>
        </span>
        <Link
          to="/share"
          className="flex flex-1 flex-col items-center justify-center gap-1 text-neutral-400"
        >
          <CameraIcon />
          <span className="text-[11px]">拍摄</span>
        </Link>
        <button
          type="button"
          disabled
          className="flex flex-1 flex-col items-center justify-center gap-1 text-neutral-400"
        >
          <ProfileIcon />
          <span className="text-[11px]">我的</span>
        </button>
      </div>
    </nav>
  )
}
