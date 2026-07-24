# AGENTS.md

Important notes for anyone (human or agent) working in this repository.

## Product

- **Name (canonical):** 見頃
  - Always display the kanji **見頃** on its own in UI and page titles.
  - Do **not** use "migoro" / "Migoro" as the product name in user-facing text. (The repo directory is `migoro-web`, but that is not the product name.)
- **Purpose:** TBD — not decided yet. Leave product-description copy empty until specified.

## Locale (hard requirement)

- The entire product is **Simplified Chinese (`zh-CN`) only**. There is no multi-language / i18n support and none is planned.
- Keep `<html lang="zh-CN">` (set in `src/routes/__root.tsx`).
- All user-facing text must be Simplified Chinese.
- The map is localized via `Language.SIMPLIFIED_CHINESE`. Some world-level labels (continents, oceans) ship without `name:zh-Hans` data and fall back to their default language — this is expected MapTiler behavior, not a bug.

## Tech stack

- TanStack Start (SSR) + `@tanstack/react-router`, React 19, Vite 8, Tailwind CSS v4.
- Package manager: **pnpm**.
- **Client-side first.** Frontend and backend are fully separated, so this app is designed client-first. TanStack Start still performs an SSR/prerender pass, so code must not crash during SSR and must avoid hydration mismatches (see "Agent working principles"), but treat the browser as the primary runtime and keep app logic/state on the client.

## Map (MapTiler)

- Uses the official `@maptiler/sdk` (v4).
- **Client-only:** the SDK touches browser globals (`window`, WebGL) at import time, so it must never be imported during SSR. The map lives in `src/components/MapTilerMap.tsx` and is loaded via `ClientOnly` + `lazy()` from `src/routes/index.tsx`. Do not statically import the SDK into SSR-rendered modules.
- **Explicit style required:** always pass a `MapStyle` value (e.g. `MapStyle.STREETS`). SDK v4's implicit default is broken and throws during projection migration.
- **Container sizing:** size the map container with `h-full w-full` (percentage), not `absolute inset-0`. The SDK's CSS forces `.maplibregl-map { position: relative }`, which defeats `inset-0` and collapses the height to 0.
- **API key:** provided via the `VITE_MAPTILER_API_KEY` env var (`.env`, gitignored). Keys are public by nature — restrict them to your domain(s) in the MapTiler Cloud dashboard.
- **Startup geolocation:** resolve the user's position via the browser Geolocation API _before_ constructing the map, then open it already centered on that location (`zoom` 15) — the initial view IS the user's location, intentionally with no fly-in/animation. Fall back to MapTiler defaults when permission is denied or unavailable. A `GeolocateControl` (with `geolocateControl: false` on the map to avoid a duplicate button) provides the accuracy dot and on-demand re-centering; it is configured with `trackUserLocation: false` and `fitBoundsOptions.animate: false` so it snaps rather than flies and never locks the camera. The map stays fully interactive (no bounds). Requires a secure context (localhost in dev, HTTPS in prod).

## Commands

- `pnpm dev` — start the dev server (port 3000).
- `pnpm build` — production build (validates both client and SSR bundles).
- `pnpm lint` — lint.
- `pnpm generate-routes` — regenerate the TanStack route tree (`tsr generate`).

## Time dial

- `src/components/TimeDial.tsx` is a bottom-anchored half-dial (dome) day selector: drag or wheel to pick a day within the past 30 days (future locked, non-looping). One minor tick = 1 day, one major tick = 1 week.
- Motion is driven by a single `requestAnimationFrame` physics loop: inertia + friction fling, a critically-damped detent spring that snaps onto whole days, and a rubber-band spring at the bounds. All parameters are module-level constants (units in degrees/seconds); tune those rather than inlining numbers.
- The interactive hit area is constrained to the real circle via `clip-path: circle(50%)` on a transparent layer sitting above the visual dome. Never use `overflow-hidden` to fake a rectangular hit box, and keep the box-shadow on the visual layer (clip-path would clip it).
- Honors `prefers-reduced-motion`: skip inertia/rubber-band and land directly on the nearest day.

## Verifying changes

- After any code change, run `pnpm lint` and `pnpm build`. The build validates both the client and SSR bundles — SSR-only breakage frequently shows up nowhere else.
- **Do not use automated browser tooling (browser-use / MCP browser) to "test" behavior on the user's behalf.** Interactive feel (drag, inertia, gestures, animation) cannot be judged from a screenshot and it burns cycles. Instead: finish the change, confirm lint + build pass, then hand off with concrete manual steps for the human — which page/URL, what to do, and what to look for.

## Agent working principles

- **Preserve the user's manual edits.** If the user says they hand-fixed something, do not revert it; build on top of it.
- **SSR / hydration safety.** Any component whose output depends on the current time, randomness, or browser APIs must avoid a server/client mismatch: seed such values once via a `useState` initializer and gate date-driven rendering and `onChange` behind a `mounted` flag (see `TimeDial.tsx`).
- **Keep tunable behavior in named constants.** Interaction/physics parameters (speeds, stiffness, thresholds) belong in module-level constants with units noted, not as inline magic numbers.
- **Match the surrounding code.** Follow the existing naming, comment density, and idioms instead of introducing a new style.
- **Only commit when asked.** Do not create commits proactively; leave changes staged/unstaged for the user unless they explicitly request a commit.
