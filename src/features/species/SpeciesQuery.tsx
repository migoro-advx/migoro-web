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

import BottomNav, { NAV_OFFSET } from '#/components/BottomNav'
import { SpeciesFlower, SproutMark } from '#/brand/illustrations'
import { api } from '#/lib/api'
import type { Species } from '#/lib/api'
import { queryOpenAtom, selectedSpeciesAtom } from './state'

// Fallback accent color when a species has no `accentColor` (real backend may
// omit this presentation-only hint).
const FALLBACK_ACCENT = '#e5e5e5'

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
    <div className="t-panel-in fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white">
      <div
        className="mx-auto w-full max-w-md px-6 pt-[calc(env(safe-area-inset-top)+1rem)]"
        style={{ paddingBottom: `calc(${NAV_OFFSET} + 2rem)` }}
      >
        {/* Back control — connective affordance until the global bottom nav
            (地图/拍摄/我的) lands; then this can be removed. */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="返回"
          className="-ml-2 mb-2 flex h-9 w-9 items-center justify-center rounded-full text-2xl text-muted"
        >
          <span aria-hidden>‹</span>
        </button>

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
                <div className="mt-4 flex justify-center">
                  {inSeason.map((s, i) => (
                    <SeasonCard
                      key={s.id}
                      species={s}
                      index={i}
                      total={inSeason.length}
                      onPick={pick}
                    />
                  ))}
                </div>
              </section>
            )}

            {others.length > 0 && (
              <section className="mt-7">
                <h2 className="text-lg font-bold text-ink">其他花卉</h2>
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
                  暂未收录这个名称 · 浏览其他花卉
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

function SeasonCard({
  species,
  index,
  total,
  onPick,
}: {
  species: Species
  index: number
  total: number
  onPick: (s: Species) => void
}) {
  // Decorative fan: edges tilt outward, the middle card sits straight and
  // raised, and neighbors overlap slightly — matching the mockup's card stack.
  const mid = (total - 1) / 2
  const rotate = (index - mid) * 6
  const raised = Math.abs(index - mid) < 0.5
  const style: React.CSSProperties = {
    transform: `rotate(${rotate}deg) translateY(${raised ? -10 : 8}px)`,
    zIndex: raised ? 20 : 10,
    marginLeft: index === 0 ? 0 : -12,
    '--i': index,
  } as React.CSSProperties
  return (
    <button
      type="button"
      onClick={() => onPick(species)}
      style={style}
      className="t-stagger-item flex w-[34%] flex-col rounded-3xl bg-white p-2 text-left shadow-[0_8px_24px_rgba(214,138,95,.18)] ring-1 ring-black/5 t-press"
    >
      <span className="flex w-full items-center justify-center">
        <SpeciesFlower index={index} className="w-full block" />
      </span>
      <span className="mt-2 px-1 text-sm font-semibold text-ink">{species.commonName}</span>
      {species.periodLabel && (
        <span className="px-1 pb-1 text-xs text-muted">{species.periodLabel}</span>
      )}
    </button>
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
      style={
        {
          backgroundColor: species.accentColor ?? FALLBACK_ACCENT,
          '--i': Math.min(index, 8),
        } as React.CSSProperties
      }
      className="t-stagger-item flex items-center justify-between rounded-full px-5 py-4 text-left t-press"
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
