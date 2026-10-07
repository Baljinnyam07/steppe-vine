import { useEffect, useRef, useState } from 'react'
import { WINES, fmtPrice, DELIVERY } from '../data/wines'
import { useStore } from '../store'
import Stepper from './Stepper'
import { track } from '../lib/track'
import './shop.css'

/*
 * The shop: a light, fast catalogue built from the wine posters. Every card and the detail view add
 * straight to the cart ("Сагсанд нэмэх" turns into a − 1 + control); the cart button (top right) and the
 * bottom bar open the checkout (OrderModal).
 */
const FACEBOOK = 'https://www.facebook.com/profile.php?id=61594372082930'
const INSTAGRAM = 'https://www.instagram.com/steppenvine/'
const sub = (w) => `${w.grape}${w.year ? ` · ${w.year}` : ''} · ${w.volume} ml`
const SOON = 'Үнэ удахгүй' // a wine without a price yet can be looked at but not ordered

const Plus = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
)

/** "Сагсанд нэмэх" until the wine is in the cart, then a − qty + control. */
function AddToCart({ w, className = '' }) {
  const qty = useStore((s) => s.cart[w.id] || 0)
  const setQty = useStore((s) => s.setQty)
  if (!w.price) return <span className={`soon ${className}`}>{SOON}</span>
  if (qty === 0) {
    return <button className={`add ${className}`} onClick={() => setQty(w.id, 1)}><Plus />Сагсанд нэмэх</button>
  }
  return <Stepper qty={qty} onChange={(n) => setQty(w.id, n)} label={w.name} />
}

function Card({ w, i }) {
  const open = useStore((s) => s.openDetail)
  return (
    <article className="wc" style={{ '--i': i }}>
      <button className="wc__img" onClick={() => open(i)} aria-label={`${w.name}: дэлгэрэнгүй`}>
        <img
          src={w.card} srcSet={`${w.cardSm} 480w, ${w.card} 800w`} sizes="(max-width: 820px) 46vw, 340px"
          alt={w.name} decoding="async" loading={i < 4 ? 'eager' : 'lazy'} fetchpriority={i < 2 ? 'high' : 'auto'} width="800" height="800"
        />
        <span className="wc__hint" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
        </span>
      </button>
      <div className="wc__body">
        <h3>{w.name}</h3>
        <p>{sub(w)}</p>
        <div className="wc__row">
          <b>{w.price ? fmtPrice(w.price) : ''}</b>
          <AddToCart w={w} />
        </div>
      </div>
    </article>
  )
}

function Detail() {
  const { view, index, closeDetail, openOrder, openZoom } = useStore()
  const inCart = useStore((s) => (s.cart[WINES[s.index].id] || 0) > 0)
  const track = useRef()
  const [page, setPage] = useState(0)
  const w = WINES[index]
  const open = view === 'detail'

  useEffect(() => {
    if (!open) return
    setPage(0)
    if (track.current) track.current.scrollLeft = 0
    const key = (e) => {
      const st = useStore.getState()
      if (st.orderOpen || st.zoom) return
      if (e.key === 'Escape') closeDetail()
      const el = track.current
      if (!el) return
      const n = Math.round(el.scrollLeft / el.clientWidth)
      if (e.key === 'ArrowRight') el.scrollTo({ left: (n + 1) * el.clientWidth, behavior: 'smooth' })
      if (e.key === 'ArrowLeft') el.scrollTo({ left: (n - 1) * el.clientWidth, behavior: 'smooth' })
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open, index, closeDetail])

  if (!open) return null
  const go = (n) => track.current?.scrollTo({ left: n * track.current.clientWidth, behavior: 'smooth' })
  const last = w.gallery.length - 1

  return (
    <div className="det" role="dialog" aria-modal="true" aria-label={w.name}>
      <div className="shop__bg" aria-hidden="true" />
      <button className="det__back" onClick={closeDetail} aria-label="Буцах">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12H4M10 6l-6 6 6 6" /></svg>
      </button>

      <div className="det__scroll">
        <div className="det__inner">
          <div className="det__gallery">
            <div className="det__track" ref={track} onScroll={(e) => { const n = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth); if (n !== page) { setPage(n); if (n > 0) track('gallery_page', w.id, { page: n + 1 }) } }}>
              {w.gallery.map((src, k) => <img key={src} src={src} style={{ aspectRatio: w.ratio || 1 }} alt={`${w.name} ${k + 1}`} decoding="async" loading={k === 0 ? 'eager' : 'lazy'} onClick={() => openZoom(src)} />)}
            </div>
            {page > 0 && <button className="det__arrow det__arrow--l" onClick={() => go(page - 1)} aria-label="Өмнөх зураг"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></button>}
            {page < last && <button className="det__arrow det__arrow--r" onClick={() => go(page + 1)} aria-label="Дараагийн зураг"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg></button>}
            <div className="det__dots" hidden={w.gallery.length < 2}>
              {w.gallery.map((_, k) => <button key={k} className={k === page ? 'on' : ''} onClick={() => go(k)} aria-label={`Зураг ${k + 1}`} />)}
            </div>
          </div>

          <div className="det__info">
            <p className="det__kind">{w.kind}</p>
            <h2>{w.name}</h2>
            <p className="det__sub">{sub(w)}</p>
            <p className="det__origin">{w.origin}</p>
            {w.rating && <p className="det__rating"><b>{w.rating.score}</b> оноо · {w.rating.source}</p>}
            <p className="det__tag">{w.tagline}</p>
            <dl className="det__facts">
              <div><dt>Амт</dt><dd>{w.tasting}</dd></div>
              <div><dt>Зохицол</dt><dd>{w.pairing}</dd></div>
            </dl>
          </div>
        </div>
      </div>

      <div className="det__bar">
        <div className="det__price"><small>1 лонх · {w.volume} ml</small><b>{w.price ? fmtPrice(w.price) : SOON}</b></div>
        <div className="det__act">
          {w.price ? <AddToCart w={w} className="add--big" /> : null}
          {inCart && <button className="det__go" onClick={openOrder}>Сагс</button>}
        </div>
      </div>
    </div>
  )
}

/** The poster viewer: the whole poster fitted to the screen, ‹ › (buttons, keys, swipe) to move between the wine's posters. */
function Zoom() {
  const src = useStore((s) => s.zoom)
  const index = useStore((s) => s.index)
  const { closeZoom, setZoom } = useStore.getState()
  const touch = useRef(null)
  const list = WINES[index].gallery
  const pos = list.indexOf(src)
  const move = (d) => { const n = pos + d; if (n >= 0 && n < list.length) setZoom(list[n]) }

  useEffect(() => {
    if (!src) return
    const key = (e) => {
      if (e.key === 'Escape') closeZoom()
      if (e.key === 'ArrowRight') move(1)
      if (e.key === 'ArrowLeft') move(-1)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [src, pos])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!src) return null
  return (
    <div
      className="zoom" role="dialog" aria-modal="true" aria-label="Постер"
      onClick={(e) => { if (e.target === e.currentTarget) closeZoom() }}
      onTouchStart={(e) => { touch.current = e.touches.length === 1 ? e.touches[0].clientX : null }}
      onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 60) move(dx < 0 ? 1 : -1) }}
    >
      <button className="zoom__x" onClick={closeZoom} aria-label="Хаах">×</button>
      <img key={src} src={src} alt="" draggable="false" />
      {pos > 0 && <button className="zoom__arrow zoom__arrow--l" onClick={() => move(-1)} aria-label="Өмнөх"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></button>}
      {pos < list.length - 1 && <button className="zoom__arrow zoom__arrow--r" onClick={() => move(1)} aria-label="Дараагийн"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg></button>}
      {list.length > 1 && <div className="zoom__count">{pos + 1} / {list.length}</div>}
    </div>
  )
}

const Bag = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
)

export default function Shop() {
  const cart = useStore((s) => s.cart)
  const view = useStore((s) => s.view)
  const orderOpen = useStore((s) => s.orderOpen)
  const openOrder = useStore((s) => s.openOrder)
  const bottles = Object.values(cart).reduce((a, b) => a + b, 0)
  const total = WINES.reduce((a, w) => a + (cart[w.id] || 0) * w.price, 0) + (Object.keys(cart).length ? DELIVERY : 0)
  const [bump, setBump] = useState(false)

  // the cart button pops when something is added
  useEffect(() => {
    if (!bottles) return
    setBump(true)
    const t = setTimeout(() => setBump(false), 350)
    return () => clearTimeout(t)
  }, [bottles])

  return (
    <div className={`shop ${bottles ? 'shop--bar' : ''} ${orderOpen ? 'shop--lock' : ''}`}>
      <div className="shop__bg" aria-hidden="true" />
      <button className={`shop__cart ${bump ? 'is-bump' : ''}`} onClick={openOrder} aria-label={`Сагс: ${bottles} шил`}>
        <Bag />
        {bottles > 0 && <span className="shop__badge">{bottles}</span>}
      </button>

      <header className="shop__hero">
        <img className="shop__logo" src="/logo.webp" alt="Steppe & Vine" width="903" height="668" />
        <p>Authentic wines from <em>Napa Valley, California</em></p>
      </header>

      <main className="shop__grid" id="wines">
        {WINES.map((w, i) => <Card key={w.id} w={w} i={i} />)}
      </main>

      <footer className="shop__foot">
        <div className="shop__social">
          <a href={FACEBOOK} target="_blank" rel="noopener noreferrer" aria-label="Facebook" onClick={() => track('click_social', null, { to: 'facebook' })}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3z" /></svg>
            Facebook
          </a>
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram" onClick={() => track('click_social', null, { to: 'instagram' })}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg>
            Instagram
          </a>
        </div>
        <small>© Steppe &amp; Vine</small>
      </footer>

      {/* bottom bar with the cart total (the detail view has its own bar) */}
      {bottles > 0 && view === 'board' && !orderOpen && (
        <div className="cartbar">
          <div><small>{bottles} шил</small><b>{fmtPrice(total)}</b></div>
          <button onClick={openOrder}>Захиалга өгөх</button>
        </div>
      )}

      <Detail />
      <Zoom />
    </div>
  )
}
