import { useEffect, useState } from 'react'
import { useStore } from '../store'

/*
 * Small "how to use" hints with a hand icon: tap a bottle (home) and drag to turn it (detail view).
 * They stay on screen (they only fade while the view is changing).
 */
const Hand = ({ children }) => (
  <svg className="hint__hand" viewBox="0 0 64 64" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M26 40V15a4 4 0 0 1 8 0v17m0-3.5a3.5 3.5 0 0 1 7 0V33m0-2.5a3.5 3.5 0 0 1 7 0V43c0 9-6 15-14 15h-2c-6 0-9-3-12-8l-6-10a3.5 3.5 0 0 1 6-3.5l4 5.5" />
    {children}
  </svg>
)

export default function Hints() {
  const view = useStore((s) => s.view)
  const ready = useStore((s) => s.ready)
  const [showTap, setShowTap] = useState(false)
  const [showDrag, setShowDrag] = useState(false)

  // Always visible: the tap hint on the home view (a moment after the scene appears / the view returns),
  // the drag hint in the detail view (once the camera has settled). They fade out only while the view changes.
  useEffect(() => {
    setShowTap(false); setShowDrag(false)
    if (view === 'board') {
      if (!ready) return
      const t = setTimeout(() => setShowTap(true), 1800)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setShowDrag(true), 3200)
    return () => clearTimeout(t)
  }, [view, ready])

  return (
    <>
      <div className={`hint hint--tap ${showTap && view === 'board' ? 'is-on' : ''}`} aria-hidden="true">
        <Hand>
          <path className="hint__ray" d="M21 13l-5-2M43 13l5-2M25 6l-3-4M39 6l3-4" />
        </Hand>
        <span>Дарс дээр дарж үзнэ үү</span>
      </div>
      <div className={`hint hint--drag ${showDrag && view === 'detail' ? 'is-on' : ''}`} aria-hidden="true">
        <Hand>
          <path className="hint__arrows" d="M8 16h9M12 12l-4 4 4 4M56 16h-9M52 12l4 4-4 4" />
        </Hand>
        <span>Лонхыг чирж эргүүлнэ үү</span>
      </div>
    </>
  )
}
