// Full-screen species-query overlay. Opened from the map's top search box (see
// routes/index.tsx). Fetches the platform species catalog via SWR, filters it
// client-side, and groups it into 当前花期 / 其他花卉. Picking a species writes
// `selectedSpeciesAtom` and closes the overlay.
//
// Client-only: index.tsx only mounts this when `queryOpenAtom` is true, so no
// fetch runs during SSR.
import { useMemo, useState } from 'react'
import { useSetAtom } from 'jotai'
import useSWR from 'swr'

import BackButton from '#/components/BackButton'
import BottomNav, { NAV_OFFSET } from '#/components/BottomNav'
import { SproutMark } from '#/brand/illustrations'
import { api } from '#/lib/api'
import type { Species } from '#/lib/api'
import SeasonFan from './SeasonFan'
import { queryOpenAtom, selectedSpeciesAtom } from './state'

function MagnifierIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function SpeciesQuery() {
  const setSelected = useSetAtom(selectedSpeciesAtom)
  const setOpen = useSetAtom(queryOpenAtom)
  const [query, setQuery] = useState('')

  const { data, error, isLoading } = useSWR('species:list', () => api.listSpecies())

  const { inSeason, others, isEmpty } = useMemo(() => {
    const list = data ?? []
    const q = query.trim().toLowerCase()
    const matched = q
      ? list.filter(
          s => s.commonName.toLowerCase().includes(q) || s.scientificName.toLowerCase().includes(q),
        )
      : list
    return {
      inSeason: matched.filter(s => s.inSeason),
      others: matched.filter(s => !s.inSeason),
      isEmpty: matched.length === 0,
    }
  }, [data, query])

  function pick(species: Species) {
    setSelected(species)
    setOpen(false)
  }

  return (
    <div className="t-panel-in fixed inset-0 z-50 flex flex-col overflow-x-clip overflow-y-auto bg-white">
      <div
        className="mx-auto w-full max-w-md px-6 pt-[calc(env(safe-area-inset-top)+1rem)]"
        style={{ paddingBottom: `calc(${NAV_OFFSET} + 2rem)` }}
      >
        {/* Back control — connective affordance until the global bottom nav
            (地图/拍摄/我的) lands; then this can be removed. The -ml-1 wrapper
            compensates this page's wider px-6 gutter so the arrow lands at the
            same screen x as the px-5 pages. */}
        <div className="-ml-1 mb-2">
          <BackButton onClick={() => setOpen(false)} />
        </div>

        <h1 className="text-4xl font-bold text-accent">选择花卉</h1>
        <p className="mt-1 text-sm text-muted">从平台收录的花叶物种中选择</p>

        <div className="mt-5 flex items-center gap-2 rounded-full bg-white px-4 py-3 ring-1 ring-peach-rim">
          <MagnifierIcon className="text-accent" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="名称、别名或拼音"
            className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
        </div>

        {isLoading ? (
          <p className="t-shimmer mt-8 text-sm" data-text="加载中…">
            加载中…
          </p>
        ) : error ? (
          <p className="mt-8 text-sm text-muted">加载失败，请稍后再试。</p>
        ) : (
          <>
            {inSeason.length > 0 && (
              <section className="mt-7">
                <h2 className="text-lg font-bold text-ink">当前花期</h2>
                <div className="mt-4">
                  <SeasonFan species={inSeason} onPick={pick} />
                </div>
              </section>
            )}

            {others.length > 0 && (
              <section className="mt-7">
                <h2 className="text-lg font-bold text-ink">其它花卉</h2>
                <div className="mt-3 flex flex-col gap-3">
                  {others.map((s, i) => (
                    <OtherRow key={s.id} species={s} index={i} onPick={pick} />
                  ))}
                </div>
              </section>
            )}

            {isEmpty && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mt-8 flex w-full items-center justify-between gap-3 rounded-3xl bg-peach px-5 py-4 text-left"
              >
                <span className="text-sm font-medium text-accent">
                  暂未收录这个名称 · 浏览其它花卉
                </span>
                <SproutMark className="h-10 w-10 shrink-0" />
              </button>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

function OtherRow({
  species,
  index,
  onPick,
}: {
  species: Species
  index: number
  onPick: (s: Species) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(species)}
      // Cap the stagger index so the total delay stays under ~320ms.
      style={{ '--i': Math.min(index, 8) } as React.CSSProperties}
      // Rows alternate peach / celadon by visible position, so the rhythm
      // holds even while the list is filtered by search.
      className={`t-stagger-item flex items-center justify-between rounded-full px-5 py-4 text-left t-press ${
        index % 2 === 0 ? 'bg-peach' : 'bg-celadon'
      }`}
    >
      <span className="text-sm font-medium text-ink">
        {species.commonName}
        {species.periodLabel && <span className="text-ink/60"> · {species.periodLabel}</span>}
      </span>
      <span aria-hidden className="text-lg text-ink/40">
        ›
      </span>
    </button>
  )
}
