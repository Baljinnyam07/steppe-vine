import { create } from 'zustand'

// view: 'board' (the catalogue) | 'detail' (one wine's page)
const MAX = 3 // bottles of one wine per customer
const CART_KEY = 'sv-cart'
const loadCart = () => {
  try {
    const c = JSON.parse(localStorage.getItem(CART_KEY) || '{}')
    return c && typeof c === 'object' ? c : {}
  } catch { return {} }
}
const saveCart = (c) => { try { localStorage.setItem(CART_KEY, JSON.stringify(c)) } catch { /* private mode etc. */ } }

/*
 * Overlays (detail page, cart, poster zoom) are real history entries: the phone's Back button closes the
 * top overlay instead of leaving the site. UI "close" buttons call history.back() too, so both stay in sync.
 */
const push = (state) => { try { history.pushState(state, '') } catch { /* ignore */ } }
const back = (v, fallback) => { if (history.state?.v === v) history.back(); else fallback() }

export const useStore = create((set, get) => ({
  index: 0,          // wine shown in the detail view
  view: 'board',
  orderOpen: false,  // the cart / checkout window
  zoom: null,        // poster shown full screen (src) or null
  cart: loadCart(),  // { wineId: bottles }

  openDetail: (index) => {
    if (get().view !== 'board') return
    push({ v: 'detail', i: index })
    set({ index, view: 'detail' })
  },
  closeDetail: () => back('detail', () => set({ view: 'board' })),

  openOrder: () => {
    if (get().orderOpen) return
    push({ v: 'order', view: get().view, i: get().index })
    set({ orderOpen: true })
  },
  closeOrder: () => back('order', () => set({ orderOpen: false })),

  openZoom: (src) => {
    push({ v: 'zoom', src, i: get().index })
    set({ zoom: src })
  },
  closeZoom: () => back('zoom', () => set({ zoom: null })),
  setZoom: (src) => set({ zoom: src }), // next / previous poster inside the open viewer (no new history entry)

  setQty: (id, n) => set((s) => {
    const cart = { ...s.cart }
    const q = Math.max(0, Math.min(MAX, n))
    if (q) cart[id] = q; else delete cart[id]
    saveCart(cart)
    return { cart }
  }),
  clearCart: () => { saveCart({}); set({ cart: {} }) }
}))

// Back / forward: rebuild what is open from the history entry we landed on.
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (e) => {
    const st = e.state || {}
    const inDetail = st.v === 'detail' || st.view === 'detail' || (st.v === 'zoom')
    useStore.setState({
      view: inDetail ? 'detail' : 'board',
      index: st.i ?? useStore.getState().index,
      orderOpen: st.v === 'order',
      zoom: st.v === 'zoom' ? st.src : null
    })
  })
}
