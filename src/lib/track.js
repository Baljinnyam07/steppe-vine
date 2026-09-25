import { supabase } from './supabase'
import { WINES } from '../data/wines'
import { useStore } from '../store'

// Anonymous, cookie-free usage counters (see supabase/schema.sql -> events, daily_stats, wine_stats).
let sid
const session = () => {
  if (sid) return sid
  try {
    sid = sessionStorage.getItem('sv-sid') || crypto.randomUUID()
    sessionStorage.setItem('sv-sid', sid)
  } catch { sid = crypto.randomUUID() }
  return sid
}

export function track(type, wineId = null) {
  if (!supabase) return
  supabase.from('events').insert({
    type, wine_id: wineId, session_id: session(),
    device: window.innerWidth < 820 ? 'mobile' : 'desktop',
    referrer: type === 'visit' ? document.referrer.slice(0, 200) || null : null
  }).then(() => {}, () => {}) // analytics must never break the page
}

export function initTracking() {
  track('visit')
  useStore.subscribe((s, p) => {
    if (s.view === 'detail' && p.view !== 'detail') track('open_wine', WINES[s.index].id)
    if (s.orderOpen && !p.orderOpen) track('open_order', WINES[s.index].id)
  })
}
