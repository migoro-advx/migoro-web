import { useEffect } from 'react'

/**
 * Registers the PWA service worker on the client.
 *
 * Renders nothing. `useEffect` never runs during SSR, so this is
 * hydration-safe and touches `navigator` only in the browser.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Registration failures are non-fatal: the app still works, it just
      // won't be installable. Swallow to avoid noisy console errors.
    })
  }, [])

  return null
}
