import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useStore } from '../store'

/*
 * Full-screen loading screen: a glass bottle that fills with wine while the 3D scene loads.
 * It leaves (fades out) only when the scene is really ready (store.ready is set by <SceneReady/> in
 * three/Scene.jsx once every texture / model has loaded and a few frames have been drawn).
 */
const BODY = 'M50 8h20v6l-1.5 2v52c0 14 22 24 22 60v140a12 12 0 0 1-12 12H41.5a12 12 0 0 1-12-12V128c0-36 22-46 22-60V16l-1.5-2z'

export default function Loader() {
  const ready = useStore((s) => s.ready)
  const real = useProgress((s) => s.progress)
  const [shown, setShown] = useState(0)
  const [out, setOut] = useState(false)
  const [gone, setGone] = useState(false)

  // the level eases towards the real progress (never jumps, never goes back); 100 only when ready
  useEffect(() => {
    const t0 = performance.now()
    let last = t0
    let raf
    const tick = (now) => {
      const dt = Math.min(0.5, (now - last) / 1000) // seconds; time-based so low frame rates still fill up
      last = now
      const target = ready ? 100 : Math.min(92, Math.max(real * 0.92, ((now - t0) / 1000) * 9))
      setShown((s) => (target > s ? Math.min(target, s + Math.max(6 * dt, (target - s) * (1 - Math.exp(-dt * 3)))) : s))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ready, real])

  useEffect(() => {
    if (!ready || shown < 99.5) return
    const t = setTimeout(() => setOut(true), 350)
    return () => clearTimeout(t)
  }, [ready, shown])

  useEffect(() => {
    if (!out) return
    const t = setTimeout(() => setGone(true), 1000)
    return () => clearTimeout(t)
  }, [out])

  if (gone) return null
  const pct = Math.min(100, Math.floor(shown))
  const level = 250 - (pct / 100) * 200 // wine surface y inside the bottle (250 = empty, 50 = full)

  return (
    <div className={`loader ${out ? 'loader--out' : ''}`} role="status" aria-live="polite" aria-label="Ачаалж байна">
      <div className="loader__inner">
        <svg className="loader__bottle" viewBox="0 0 120 300" aria-hidden="true">
          <defs>
            <clipPath id="ld-clip"><path d={BODY} /></clipPath>
            <linearGradient id="ld-glass" x1="0" x2="1">
              <stop offset="0" stopColor="#fff" stopOpacity=".55" />
              <stop offset=".35" stopColor="#fff" stopOpacity=".12" />
              <stop offset="1" stopColor="#fff" stopOpacity=".38" />
            </linearGradient>
            <linearGradient id="ld-wine" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#8a1f37" />
              <stop offset="1" stopColor="#3a0813" />
            </linearGradient>
          </defs>

          <g clipPath="url(#ld-clip)">
            <g style={{ transform: `translateY(${level}px)`, transition: 'transform .25s linear' }}>
              <rect x="0" y="0" width="120" height="320" fill="url(#ld-wine)" />
              <g className="loader__wave loader__wave--a"><path d="M-120 0q15-9 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0v14h-240z" fill="#a52843" /></g>
              <g className="loader__wave loader__wave--b"><path d="M-120 3q15 8 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0v14h-240z" fill="#8a1f37" opacity=".85" /></g>
              <circle className="loader__bub b1" cx="48" cy="120" r="2.2" />
              <circle className="loader__bub b2" cx="66" cy="150" r="1.6" />
              <circle className="loader__bub b3" cx="56" cy="90" r="1.3" />
            </g>
          </g>

          <path d={BODY} fill="url(#ld-glass)" stroke="#fff" strokeOpacity=".9" strokeWidth="2.2" strokeLinejoin="round" />
          <rect x="49" y="4" width="22" height="14" rx="2.5" fill="#6a1f2c" stroke="#fff" strokeOpacity=".5" />
          {/* label: dark burgundy paper with the brand logo */}
          <rect x="33" y="170" width="54" height="76" rx="3" fill="#4a1420" />
          <rect x="36" y="173" width="48" height="70" rx="2" fill="none" stroke="#d8b878" strokeWidth=".8" opacity=".85" />
          <image href="/logo.png" x="38.5" y="190" width="43" height="32" preserveAspectRatio="xMidYMid meet" />
          <path className="loader__shine" d="M38 132c-1 20-1 90-1 132" stroke="#fff" strokeOpacity=".65" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M52 22v44" stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className="loader__brand">Steppe &amp; Vine</p>
        <p className="loader__pct">{pct}%</p>
      </div>
    </div>
  )
}
