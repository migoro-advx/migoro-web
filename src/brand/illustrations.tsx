/**
 * Brand illustrations for 見頃.
 *
 * These are plain <img> references to static SVG files under `public/`, served
 * at the site root. Drop the artwork in and it shows up — no code change needed.
 *
 *   public/illustrations/<speciesId>.svg   — 当前花期 card flowers
 *   public/illustrations/sprout.svg         — 嫩芽 used in the peach banners
 *
 * e.g. 樱花 -> public/illustrations/prunus-serrulata.svg
 */

/** Per-species flower shown on a 当前花期 card. */
export function SpeciesFlower({ speciesId, className }: { speciesId: string; className?: string }) {
  return (
    <img
      src={`/illustrations/${speciesId}.svg`}
      alt=""
      aria-hidden
      className={className}
      style={{ objectFit: 'contain' }}
    />
  )
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
