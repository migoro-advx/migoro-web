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
