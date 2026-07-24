/**
 * Unified brand assets for 見頃.
 *
 * Single source of truth for the product name, brand color, and logo.
 * The real logo is undecided, so `BrandLogo` renders a solid blue square
 * placeholder for now — swap the implementation here when the asset lands.
 */

/** Canonical product name. Always displayed as the kanji on its own. */
export const BRAND_NAME = '見頃'

/** Primary brand color (placeholder until the real palette is defined). */
export const BRAND_BLUE = '#2563eb'

/**
 * Core palette for the peach/salmon + sage-green aesthetic, for use in JS
 * (inline styles, canvas/DOM builders that can't reach Tailwind classes).
 *
 * These MUST mirror the `@theme` tokens in `src/styles.css` — keep the two in
 * sync so `bg-peach` / `text-accent` etc. resolve to the same hex values.
 */
export const COLORS = {
  accent: '#e8865a', // primary orange — title, ticks, apex, 清除, links
  accentStrong: '#ef7a4d', // FAB
  peach: '#fbe0d0', // banners / card panels
  peachRim: '#f6ccae', // dome rim / search ring
  peachTick: '#dd8a5f', // dial ticks
  sage: '#9fb083', // nav circles / green pill
  sageSoft: '#c8d4b4',
  celadon: '#d7e3df', // blue-green tint / pills
  ink: '#3d3a36', // warm near-black text
  muted: '#9a968f', // secondary text
} as const

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div
      className={className ?? 'h-12 w-12'}
      style={{ backgroundColor: BRAND_BLUE }}
      role="img"
      aria-label={BRAND_NAME}
    />
  )
}
