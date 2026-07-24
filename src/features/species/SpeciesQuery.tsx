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

import { api } from '#/lib/api'
import type { Species } from '#/lib/api'
import { queryOpenAtom, selectedSpeciesAtom } from './state'

// Fallback accent color when a species has no `accentColor` (real backend may
// omit this presentation-only hint).
const FALLBACK_ACCENT = '#e5e5e5'

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
          s =>
            s.commonName.toLowerCase().includes(q) ||
            s.scientificName.toLowerCase().includes(q),
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
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white">
      <div className="mx-auto w-full max-w-md px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-10">
        {/* Back control — connective affordance until the global bottom nav
            (地图/拍摄/我的) lands; then this can be removed. */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="返回"
          className="-ml-2 mb-2 flex h-9 w-9 items-center justify-center rounded-full text-2xl text-neutral-500"
        >
          <span aria-hidden>‹</span>
        </button>

        <h1 className="text-3xl font-bold text-neutral-900">选择花卉</h1>
        <p className="mt-1 text-sm text-neutral-400">从平台收录的花叶物种中选择</p>

        <div className="mt-5 flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-3">
          <span aria-hidden className="text-neutral-400">
            ⌕
          </span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="名称、别名或拼音"
            className="w-full bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
          />
        </div>

        {isLoading ? (
          <p className="mt-8 text-sm text-neutral-400">加载中…</p>
        ) : error ? (
          <p className="mt-8 text-sm text-neutral-400">加载失败，请稍后再试。</p>
        ) : (
          <>
            {inSeason.length > 0 && (
              <section className="mt-7">
                <h2 className="text-lg font-bold text-neutral-900">当前花期</h2>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {inSeason.map(s => (
                    <SeasonCard key={s.id} species={s} onPick={pick} />
                  ))}
                </div>
              </section>
            )}

            {others.length > 0 && (
              <section className="mt-7">
                <h2 className="text-lg font-bold text-neutral-900">其他花卉</h2>
                <div className="mt-3 flex flex-col gap-3">
                  {others.map(s => (
                    <OtherRow key={s.id} species={s} onPick={pick} />
                  ))}
                </div>
              </section>
            )}

            {isEmpty && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mt-8 w-full rounded-full bg-orange-100 px-5 py-4 text-left text-sm text-orange-500"
              >
                暂未收录这个名称 · 浏览其他花卉
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SeasonCard({ species, onPick }: { species: Species; onPick: (s: Species) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(species)}
      className="flex flex-col text-left"
    >
      <span
        className="flex aspect-square w-full items-center justify-center rounded-2xl"
        style={{ backgroundColor: species.accentColor ?? FALLBACK_ACCENT }}
      >
        <span className="h-5 w-5 rounded-full bg-black/25" aria-hidden />
      </span>
      <span className="mt-2 text-sm font-semibold text-neutral-900">{species.commonName}</span>
      {species.periodLabel && (
        <span className="mt-0.5 text-xs text-neutral-400">{species.periodLabel}</span>
      )}
    </button>
  )
}

function OtherRow({ species, onPick }: { species: Species; onPick: (s: Species) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(species)}
      className="flex items-center justify-between rounded-2xl bg-neutral-100 px-4 py-4 text-left"
    >
      <span className="text-sm text-neutral-800">
        {species.commonName}
        {species.periodLabel && (
          <span className="text-neutral-400"> · {species.periodLabel}</span>
        )}
      </span>
      <span aria-hidden className="text-lg text-neutral-300">
        ›
      </span>
    </button>
  )
}
