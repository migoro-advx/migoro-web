// Shared zh-CN date/time formatting for the places (地点) feature. Kept in one
// place so the panel, waterfall, and detail views read consistently.

const MS_PER_DAY = 86_400_000

/** "今天" / "昨天" / "N天前" / "N周前" for a date relative to now. */
export function relativeDay(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const picked = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const daysBack = Math.round((today.getTime() - picked.getTime()) / MS_PER_DAY)
  if (daysBack <= 0) return '今天'
  if (daysBack === 1) return '昨天'
  if (daysBack < 7) return `${daysBack}天前`
  return `${Math.floor(daysBack / 7)}周前`
}

/** "M月D日". */
export function monthDay(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/** "HH:mm". */
export function hourMinute(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Distance as "1.2 km" or "320 m", or `null` when it cannot be computed. */
export function formatDistance(km: number | null): string | null {
  if (km == null || !Number.isFinite(km)) return null
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}
