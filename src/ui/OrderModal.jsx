import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { WINES, fmtPrice } from '../data/wines'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { track, reach } from '../lib/track'
import Stepper from './Stepper'

/*
 * The cart / checkout window. The wines come from the cart in the store (added from the catalogue), the
 * visitor only adds a name and a phone number. Orders go to Supabase (table `orders`, see
 * supabase/schema.sql); without VITE_SUPABASE_* in .env nothing is sent and the order is only kept in
 * this browser (localStorage 'sv-orders').
 */
const digits = (s) => s.replace(/\D/g, '')
// 99112233 -> "9911 2233" while typing
const fmtPhone = (v) => { const d = digits(v).slice(0, 8); return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d }
const makeId = () => 'SV-' + Math.random().toString(36).slice(2, 8).toUpperCase()
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const sub = (w) => `${w.grape}${w.year ? ` · ${w.year}` : ''} · ${w.volume} ml`

const remembered = () => {
  try { return JSON.parse(localStorage.getItem('sv-customer') || '{}') } catch { return {} }
}
const EMPTY = () => { const r = remembered(); return { name: '', phone: '', email: '', note: '', ...r, phone: fmtPhone(r.phone || '') } }

export default function OrderModal() {
  const { orderOpen, closeOrder, cart, setQty, clearCart } = useStore()
  const box = useRef()
  const firstField = useRef()
  const check = useRef()
  const started = useRef(false)
  const [f, setF] = useState(EMPTY)
  const [touched, setTouched] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  const items = useMemo(() => WINES.filter((w) => cart[w.id] > 0).map((w) => ({ w, qty: cart[w.id] })), [cart])
  const total = items.reduce((a, i) => a + i.w.price * i.qty, 0)
  const bottles = items.reduce((a, i) => a + i.qty, 0)

  const errors = {}
  if (f.name.trim().length < 2) errors.name = 'Нэрээ оруулна уу'
  if (digits(f.phone).length !== 8) errors.phone = 'Утасны дугаар 8 оронтой байх ёстой'
  if (f.email.trim() && !EMAIL.test(f.email.trim())) errors.email = 'Имэйл хаяг буруу байна'

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }))
  const show = (k) => touched[k] && errors[k]

  // reset + entrance animation each time it opens
  useEffect(() => {
    if (!orderOpen) return
    setF(EMPTY()); setTouched({}); setError(''); setDone(null); setBusy(false); started.current = false
    const t = setTimeout(() => firstField.current?.focus({ preventScroll: true }), 400)
    return () => clearTimeout(t)
  }, [orderOpen])

  useEffect(() => {
    if (!orderOpen) return
    gsap.fromTo(box.current, { autoAlpha: 0, y: 28, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' })
    const key = (e) => e.key === 'Escape' && closeOrder()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [orderOpen, closeOrder])

  // The on-screen keyboard: keep the window inside the VISIBLE part of the screen (visualViewport), so the
  // fields and the send button are never hidden behind the keyboard.
  useEffect(() => {
    if (!orderOpen) return
    const vv = window.visualViewport
    const root = document.documentElement
    const fit = () => {
      root.style.setProperty('--vvh', `${vv ? vv.height : window.innerHeight}px`)
      root.style.setProperty('--vvt', `${vv ? vv.offsetTop : 0}px`)
    }
    fit()
    vv?.addEventListener('resize', fit)
    vv?.addEventListener('scroll', fit)
    return () => {
      vv?.removeEventListener('resize', fit)
      vv?.removeEventListener('scroll', fit)
      root.style.removeProperty('--vvh'); root.style.removeProperty('--vvt')
    }
  }, [orderOpen])

  useEffect(() => {
    if (!done || !check.current) return
    gsap.fromTo(check.current, { strokeDashoffset: 60 }, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.out', delay: 0.15 })
  }, [done])

  if (!orderOpen) return null


  const submit = async (e) => {
    e.preventDefault()
    setTouched({ name: true, phone: true, email: true })
    if (Object.keys(errors).length || !items.length) { track('form_error', null, { fields: Object.keys(errors).join(',') || 'empty_cart' }); return }
    setBusy(true); setError('')
    const order = {
      id: makeId(),
      items: items.map(({ w, qty }) => ({ wineId: w.id, wine: w.name, year: w.year, qty, price: w.price })),
      total,
      name: f.name.trim(), phone: digits(f.phone), email: f.email.trim(), note: f.note.trim(),
      createdAt: new Date().toISOString()
    }
    try {
      if (supabase) {
        // one row per wine, all sent in a single request (all saved or none)
        const { error: err } = await supabase.from('orders').insert(
          order.items.map((i) => ({
            code: order.id, wine_id: i.wineId, wine: i.wine, qty: i.qty,
            name: order.name, phone: order.phone, email: order.email || null, note: order.note
          }))
        )
        if (err) throw err
      }
      try {
        const all = JSON.parse(localStorage.getItem('sv-orders') || '[]')
        localStorage.setItem('sv-orders', JSON.stringify([...all, order]))
        localStorage.setItem('sv-customer', JSON.stringify({ name: order.name, phone: order.phone, email: order.email }))
      } catch { /* storage may be blocked: the order still went through */ }
      order.items.forEach((i) => track('order_sent', i.wineId, { code: order.id, qty: i.qty, total: order.total }))
      reach(5)
      clearCart()
      setDone(order)
    } catch (err) {
      track('order_failed', null, { reason: String(err?.message).includes('LIMIT_3') ? 'limit' : 'error' })
      setError(String(err?.message).includes('LIMIT_3')
        ? `Нэг утасны дугаараас нэг дарсыг нийт 3 шил хүртэл захиалах боломжтой${err.details ? ` (${err.details})` : ''}.`
        : 'Илгээж чадсангүй. Интернэтээ шалгаад дахин оролдоно уу.')
    } finally {
      setBusy(false)
    }
  }


  return (
    <div className="modal" onClick={closeOrder}>
      <div className="order order--cart glass" ref={box} role="dialog" aria-modal="true" aria-labelledby="order-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal__x" onClick={closeOrder} aria-label="Хаах">×</button>

        {done ? (
          <div className="order__done">
            <svg viewBox="0 0 64 64" className="order__check" aria-hidden="true">
              <circle cx="32" cy="32" r="28" />
              <path ref={check} d="M19 33l9 9 17-19" strokeDasharray="60" strokeDashoffset="60" />
            </svg>
            <h3 id="order-title">Захиалга бүртгэгдлээ</h3>
            <p className="order__id">Дугаар: <b>{done.id}</b></p>
            <ul className="order__sum">
              {done.items.map((i) => <li key={i.wineId}><span>{i.wine} {i.year ?? ''}</span><b>{i.qty} × {fmtPrice(i.price)}</b></li>)}
              <li className="sum-total"><span>Нийт дүн</span><b>{fmtPrice(done.total)}</b></li>
              <li><span>Нэр</span><b>{done.name}</b></li>
              <li><span>Утас</span><b>{done.phone}</b></li>
              {done.email && <li><span>Имэйл</span><b>{done.email}</b></li>}
            </ul>
            <p className="order__hint">Бид тантай утсаар холбогдож баталгаажуулна.</p>
            <div className="order__actions">
              <button className="btn-primary" onClick={closeOrder}><span className="btn-primary__shine" /><span className="btn-primary__label">Хаах</span></button>
            </div>
          </div>
        ) : (
          <form className="order__form" onSubmit={submit} noValidate onFocus={(e) => {
            if (!started.current) { started.current = true; track('form_start'); reach(4) }
            // once the keyboard is up, bring the field you are typing in to the middle of the window
            const t = e.target
            if (t.matches?.('input, textarea')) setTimeout(() => t.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320)
          }}>
            <h3 id="order-title">Сагс</h3>

            {items.length === 0 ? (
              <div className="cart-empty">
                <p>Сагс хоосон байна. Дарсаа сонгоод "Сагсанд нэмэх" дарна уу.</p>
                <button type="button" className="btn-outline" onClick={closeOrder}>Дарс сонгох</button>
              </div>
            ) : (
              <>
                <ul className="cart">
                  {items.map(({ w, qty }) => (
                    <li key={w.id}>
                      <img className="cart__img" src={w.card} alt="" width="56" height="56" />
                      <div className="cart__name">
                        <b>{w.name}</b>
                        <small>{sub(w)}</small>
                        <span>{fmtPrice(w.price)}</span>
                      </div>
                      <div className="cart__side">
                        <Stepper qty={qty} onChange={(n) => setQty(w.id, n)} label={w.name} />
                        <b>{fmtPrice(w.price * qty)}</b>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="order__total"><span>Нийт дүн · {bottles} шил</span><b>{fmtPrice(total)}</b></div>

                <div className="fld">
                  <label htmlFor="o-name">Нэр</label>
                  <input id="o-name" ref={firstField} value={f.name} onChange={set('name')} onBlur={blur('name')} placeholder="Таны нэр" autoComplete="name" aria-invalid={!!show('name')} />
                  {show('name') && <span className="fld__err">{errors.name}</span>}
                </div>
                <div className="fld">
                  <label htmlFor="o-phone">Утас</label>
                  <input id="o-phone" value={f.phone} onChange={(e) => setF((p) => ({ ...p, phone: fmtPhone(e.target.value) }))} enterKeyHint="send" onBlur={blur('phone')} inputMode="tel" placeholder="9911 2233" autoComplete="tel" aria-invalid={!!show('phone')} />
                  {show('phone') && <span className="fld__err">{errors.phone}</span>}
                </div>
                <details className="order__more" open={!!(f.email || f.note)}>
                  <summary>Имэйл, тэмдэглэл нэмэх <i>(заавал биш)</i></summary>
                  <div className="fld">
                    <label htmlFor="o-email">Имэйл</label>
                    <input id="o-email" type="email" value={f.email} onChange={set('email')} onBlur={blur('email')} inputMode="email" placeholder="name@example.com" autoComplete="email" aria-invalid={!!show('email')} />
                    {show('email') && <span className="fld__err">{errors.email}</span>}
                  </div>
                  <div className="fld">
                    <label htmlFor="o-note">Тэмдэглэл</label>
                    <textarea id="o-note" rows="2" value={f.note} onChange={set('note')} placeholder="Бэлэг, тусгай хүсэлт г.м" />
                  </div>
                </details>

                {error && <p className="order__error" role="alert">{error}</p>}
                <button className="btn-primary order__submit" type="submit" disabled={busy}>
                  <span className="btn-primary__shine" />
                  <span className="btn-primary__label">{busy ? 'Илгээж байна…' : 'Захиалга илгээх'}</span>
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
