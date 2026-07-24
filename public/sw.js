/**
 * Minimal service worker for 見頃.
 *
 * Its sole purpose is to make the app installable so it launches in a
 * standalone window (native-app look). It intentionally does NOT register a
 * `fetch` handler and caches nothing — there is no offline behavior and no
 * risk of serving stale content. Swap in real caching later if offline
 * support is ever wanted.
 */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
