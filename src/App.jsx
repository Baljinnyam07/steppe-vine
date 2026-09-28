import { lazy, Suspense, useEffect } from 'react'
import Shop from './ui/Shop'
import { useStore } from './store'
import { initTracking } from './lib/track'

// The site is a light poster catalogue (see ui/Shop.jsx). The earlier 3D showcase (WineMainBoard, three/,
// StoryPanel, Loader, Hints) is no longer used and is not part of the bundle; it stays in git history.
const loadOrder = () => import('./ui/OrderModal')
const OrderModal = lazy(loadOrder)

export default function App() {
  const orderOpen = useStore((s) => s.orderOpen)
  // start fetching the checkout code as soon as something is in the cart, so it opens instantly
  useEffect(() => useStore.subscribe((s, p) => { if (s.cart !== p.cart) loadOrder() }), [])
  useEffect(() => { initTracking() }, [])

  // hide the small start-up loader (see #boot in index.html) once the fonts and the first posters are in,
  // but not before 700 ms (no flash) and never later than 2 s (a slow image must not block the page)
  useEffect(() => {
    const boot = document.getElementById('boot')
    if (!boot) return
    const t0 = performance.now()
    const imgs = [...document.querySelectorAll('.wc__img img')].slice(0, 4)
    const loaded = imgs.map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = r })))
    const fonts = document.fonts?.ready ?? Promise.resolve()
    const done = () => {
      const wait = Math.max(0, 700 - (performance.now() - t0))
      setTimeout(() => { boot.classList.add('is-out'); setTimeout(() => boot.remove(), 600) }, wait)
    }
    Promise.race([Promise.all([fonts, ...loaded]), new Promise((r) => setTimeout(r, 2000))]).then(done)
  }, [])
  return (
    <>
      <Shop />
      <div className="ui">
        {orderOpen && <Suspense fallback={null}><OrderModal /></Suspense>}
      </div>
    </>
  )
}
