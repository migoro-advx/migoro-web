/**
 * Brand illustrations for 見頃.
 *
 * These are plain <img> references to static SVG files under `public/`, served
 * at the site root. Drop the artwork in and it shows up — no code change needed.
 *
 *   public/illustrations/*.svg     — 当前花期 card flowers (fixed rotation, see below)
 *   public/illustrations/sprout.svg — 嫩芽 used in the peach banners
 */

// 当前花期 cards always use these three illustrations in this fixed order,
// cycling by card position — independent of the actual species data.
const SEASON_FLOWERS = [
  '/illustrations/prunus-serrulata.svg',
  '/illustrations/salvia-nemorosa.svg',
  '/illustrations/hydrangea-macrophylla.svg',
] as const

/** Flower shown on a 当前花期 card, picked by card position from the fixed set. */
export function SpeciesFlower({ index, className }: { index: number; className?: string }) {
  const src = SEASON_FLOWERS[index % SEASON_FLOWERS.length]
  return <img src={src} alt="" aria-hidden className={className} style={{ objectFit: 'contain' }} />
}

/** Small seedling used in the peach banners (empty-state card + 暂未收录 footer). */
export function SproutMark({ className }: { className?: string }) {
  return (
    <img
      src="/illustrations/sprout.svg"
      alt=""
      aria-hidden
      className={className}
      style={{ objectFit: 'contain' }}
    />
  )
}

/**
 * Single flower mark used in the share journey (物种确认 primary card +
 * 发布成功 avatar). Drop the artwork at `public/illustrations/bloom.svg`.
 */
export function BloomMark({ className }: { className?: string }) {
  return (
    <img
      src="/illustrations/bloom.svg"
      alt=""
      aria-hidden
      className={className}
      style={{ objectFit: 'contain' }}
    />
  )
}
