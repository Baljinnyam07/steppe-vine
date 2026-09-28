import { WINES } from '../data/wines'
import { useStore } from '../store'

/*
 * Anonymous, cookie-free usage tracking → Supabase table `events` (see supabase/migration-analytics.sql).
 * Events are queued and sent in batches (every 4 s, and when the page is hidden / closed), so tracking
 * never slows the page down. Nothing personal is stored: a random visitor id (localStorage) and session id.
 *
 * What we learn: where visitors come from, what they look at, how far they scroll, how long they stay on
 * each wine, cart adds / removals, the checkout steps, and the LAST STEP each visit reached (the "leave"
 * event), i.e. exactly where people stop.
 */
const URL_ = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const ENABLED = !!(URL_ && KEY)

const rid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now())
const store = (k, make, area = 'localStorage') => {
  try {
    const s = window[area]
    let v = s.getItem(k)
    if (!v) { v = make(); s.setItem(k, v) }
    return v
  } catch { return make() }
}
const visitor = store('sv-vid', rid)
const session = store('sv-sid', rid, 'sessionStorage')
const isNewVisitor = (() => { try { return !localStorage.getItem('sv-seen') } catch { return true } })()
try { localStorage.setItem('sv-seen', '1') } catch { /* ignore */ }

const device = () => (window.innerWidth < 820 ? 'mobile' : window.innerWidth < 1100 ? 'tablet' : 'desktop')

// where the visitor came from: utm_source / click ids first, then the referrer's host
function sourceOf() {
  const q = new URLSearchParams(location.search)
  const utm = q.get('utm_source')
  if (utm) return utm.toLowerCase().slice(0, 40)
  if (q.get('fbclid')) return 'facebook'
  if (q.get('igshid') || q.get('igsh')) return 'instagram'
  try {
    const h = new URL(document.referrer).hostname.replace(/^www\.|^m\./, '')
    if (!h || h === location.hostname) return 'direct'
    if (/facebook|fb\.com|messenger/.test(h)) return 'facebook'
    if (/instagram/.test(h)) return 'instagram'
    if (/google/.test(h)) return 'google'
    return h.slice(0, 40)
  } catch { return 'direct' }
}

// --- sending -------------------------------------------------------------------------------------------
let queue = []
let timer = null
function flush() {
  clearTimeout(timer); timer = null
  if (!ENABLED || !queue.length) { queue = []; return }
  const batch = queue.splice(0, 200)
  try {
    fetch(`${URL_}/rest/v1/events`, {
      method: 'POST',
      keepalive: true, // still delivered while the page is closing
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(batch)
    }).catch(() => {}) // analytics must never break the page
  } catch { /* ignore */ }
  if (queue.length) timer = setTimeout(flush, 500)
}

export function track(type, wineId = null, meta = null) {
  if (!ENABLED) return
  queue.push({
    type, wine_id: wineId, session_id: session, visitor_id: visitor, device: device(),
    source: type === 'visit' ? sourceOf() : null,
    referrer: type === 'visit' ? document.referrer.slice(0, 200) || null : null,
    meta: meta || null
  })
  if (!timer) timer = setTimeout(flush, 4000)
}

// --- the journey of one visit ----------------------------------------------------------------------------
// stage reached so far: 0 landing, 1 viewed a wine, 2 added to cart, 3 opened the cart, 4 started the form, 5 ordered
const STAGES = ['landing', 'wine', 'cart_add', 'cart_open', 'form', 'order']
const state = { stage: 0, t0: Date.now(), scroll: 0, wines: new Set(), left: false }
export const reach = (n) => { if (n > state.stage) state.stage = n }

function leave() {
  if (state.left) return
  state.left = true
  track('leave', null, { stage: STAGES[state.stage], secs: Math.round((Date.now() - state.t0) / 1000), scroll: state.scroll, wines: state.wines.size })
  flush()
}

/** Hook the page up: call once. */
export function initTracking() {
  track('visit', null, { returning: !isNewVisitor, lang: (navigator.language || '').slice(0, 8), w: window.innerWidth, h: window.innerHeight })

  // leaving (tab hidden / closed): send where this visit stopped. Coming back re-arms it.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') leave()
    else { state.left = false }
  })
  window.addEventListener('pagehide', leave)

  // scroll depth of the catalogue (25 / 50 / 75 / 100 %), reported once each
  const seen = new Set()
  const onScroll = (e) => {
    const el = e.target
    if (!el || !el.classList || !el.classList.contains('shop')) return
    const pct = Math.round(((el.scrollTop + el.clientHeight) / el.scrollHeight) * 100)
    state.scroll = Math.max(state.scroll, pct)
    for (const m of [25, 50, 75, 100]) if (pct >= m - 1 && !seen.has(m)) { seen.add(m); track('scroll', null, { pct: m }) }
  }
  document.addEventListener('scroll', onScroll, true)

  // store changes → events: wine pages (with time spent), cart add / remove / quantity, cart window, poster zoom
  let dwell = null
  useStore.subscribe((s, p) => {
    if (s.view === 'detail' && p.view !== 'detail') {
      const w = WINES[s.index]
      track('open_wine', w.id)
      state.wines.add(w.id); reach(1)
      dwell = { id: w.id, t: Date.now() }
    }
    if (s.view !== 'detail' && p.view === 'detail' && dwell) {
      track('wine_dwell', dwell.id, { secs: Math.round((Date.now() - dwell.t) / 1000) })
      dwell = null
    }
    if (s.zoom && !p.zoom) track('zoom_poster', WINES[s.index].id, { src: String(s.zoom).split('/').pop() })

    if (s.cart !== p.cart) {
      for (const w of WINES) {
        const a = p.cart[w.id] || 0, b = s.cart[w.id] || 0
        if (a === b) continue
        if (a === 0) { track('add_to_cart', w.id); reach(2) }
        else if (b === 0) track('remove_from_cart', w.id)
        else track('qty_change', w.id, { qty: b })
      }
    }
    if (s.orderOpen && !p.orderOpen) {
      const items = WINES.filter((w) => s.cart[w.id] > 0)
      track('open_order', items[0]?.id ?? null, { bottles: items.reduce((a, w) => a + s.cart[w.id], 0), total: items.reduce((a, w) => a + s.cart[w.id] * w.price, 0), empty: items.length === 0 })
      reach(3)
    }
  })
}
