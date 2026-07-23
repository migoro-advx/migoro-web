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

## Map (MapTiler)

- Uses the official `@maptiler/sdk` (v4).
- **Client-only:** the SDK touches browser globals (`window`, WebGL) at import time, so it must never be imported during SSR. The map lives in `src/components/MapTilerMap.tsx` and is loaded via `ClientOnly` + `lazy()` from `src/routes/index.tsx`. Do not statically import the SDK into SSR-rendered modules.
- **Explicit style required:** always pass a `MapStyle` value (e.g. `MapStyle.STREETS`). SDK v4's implicit default is broken and throws during projection migration.
- **Container sizing:** size the map container with `h-full w-full` (percentage), not `absolute inset-0`. The SDK's CSS forces `.maplibregl-map { position: relative }`, which defeats `inset-0` and collapses the height to 0.
- **API key:** provided via the `VITE_MAPTILER_API_KEY` env var (`.env`, gitignored). Keys are public by nature — restrict them to your domain(s) in the MapTiler Cloud dashboard.
- **Startup geolocation:** resolve the user's position via the browser Geolocation API *before* constructing the map, then open it already centered on that location (`zoom` 15) — the initial view IS the user's location, intentionally with no fly-in/animation. Fall back to MapTiler defaults when permission is denied or unavailable. A `GeolocateControl` (with `geolocateControl: false` on the map to avoid a duplicate button) provides the accuracy dot and on-demand re-centering; it is configured with `trackUserLocation: false` and `fitBoundsOptions.animate: false` so it snaps rather than flies and never locks the camera. The map stays fully interactive (no bounds). Requires a secure context (localhost in dev, HTTPS in prod).

## Commands

- `pnpm dev` — start the dev server (port 3000).
- `pnpm build` — production build (validates both client and SSR bundles).
- `pnpm lint` — lint.
- `pnpm generate-routes` — regenerate the TanStack route tree (`tsr generate`).
