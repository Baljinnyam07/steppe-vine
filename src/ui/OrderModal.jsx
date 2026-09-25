import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { WINES, fmtPrice } from '../data/wines'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { track } from '../lib/track'

/*
 * Order form. Orders go to Supabase (table `orders`, see supabase/schema.sql). Without VITE_SUPABASE_*
 * in .env nothing is sent: the order is only kept in this browser (localStorage 'sv-orders').
 */
const MAX_QTY = 3 // per customer, per bottle

const digits = (s) => s.replace(/\D/g, '')
const makeId = () => 'SV-' + Math.random().toString(36).slice(2, 8).toUpperCase()

const EMPTY = { name: '', phone: '', email: '', note: '' }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(f, total) {
  const e = {}
  if (total < 1) e.items = 'Дор хаяж нэг дарс сонгоно уу'
  if (f.email.trim() && !EMAIL.test(f.email.trim())) e.email = 'Имэйл хаяг буруу байна'
  if (f.name.trim().length < 2) e.name = 'Нэрээ оруулна уу'
  if (digits(f.phone).length !== 8) e.phone = 'Утасны дугаар 8 оронтой байх ёстой'
  return e
}

export default function OrderModal() {
  const { orderOpen, closeOrder, index } = useStore()
  const wine = WINES[index]
  const box = useRef()
  const firstField = useRef()
  const check = useRef()
  const [f, setF] = useState(EMPTY)
  const [qty, setQty] = useState({}) // wine id -> bottles (0..3)
  const [touched, setTouched] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null) // the placed order
  const [copied, setCopied] = useState(false)

  const total = Object.values(qty).reduce((a, b) => a + b, 0)
  const sum = WINES.reduce((a, w) => a + (qty[w.id] || 0) * w.price, 0)
  const errors = useMemo(() => validate(f, total), [f, total])
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }))
  const show = (k) => touched[k] && errors[k]

  // reset + entrance animation each time it opens
  useEffect(() => {
    if (!orderOpen) return
    setF(EMPTY); setQty({ [WINES[index].id]: 1 }); setTouched({}); setError(''); setDone(null); setBusy(false); setCopied(false)
    const t = setTimeout(() => firstField.current?.focus(), 350)
    return () => clearTimeout(t)
  }, [orderOpen, index])

  useEffect(() => {
    if (!orderOpen) return
    gsap.fromTo(box.current, { autoAlpha: 0, y: 28, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: 'power3.out' })
    const key = (e) => e.key === 'Escape' && closeOrder()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [orderOpen, closeOrder])

  // draw the check mark on success
  useEffect(() => {
    if (!done || !check.current) return
    gsap.fromTo(check.current, { strokeDashoffset: 60 }, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.out', delay: 0.15 })
  }, [done])

  if (!orderOpen) return null

  const summary = (o) =>
    [
      `Захиалга ${o.id}`,
      ...o.items.map((i) => `${i.wine} ${i.year ?? ''} — ${i.qty} шил × ${fmtPrice(i.price)}`),
      `Нийт: ${fmtPrice(o.total)}`,
      `${o.name}, ${o.phone}${o.email ? `, ${o.email}` : ''}`,
      o.note ? `Тэмдэглэл: ${o.note}` : ''
    ].filter(Boolean).join('\n')

  const submit = async (e) => {
    e.preventDefault()
    setTouched({ name: true, phone: true, email: true, submit: true })
    if (Object.keys(errors).length) return
    setBusy(true); setError('')
    const items = WINES.filter((w) => qty[w.id] > 0).map((w) => ({ wineId: w.id, wine: w.name, year: w.year, qty: qty[w.id], price: w.price }))
    const order = {
      id: makeId(), items, total: items.reduce((a, i) => a + i.qty * i.price, 0),
      name: f.name.trim(), phone: digits(f.phone), email: f.email.trim(), note: f.note.trim(),
      createdAt: new Date().toISOString()
    }
    try {
      if (supabase) {
        // one row per wine, all sent in a single request (all saved or none)
        const { error: err } = await supabase.from('orders').insert(
          items.map((i) => ({
            code: order.id, wine_id: i.wineId, wine: i.wine, qty: i.qty,
            name: order.name, phone: order.phone, email: order.email || null, note: order.note
          }))
        )
        if (err) throw err
      }
      try {
        const all = JSON.parse(localStorage.getItem('sv-orders') || '[]')
        localStorage.setItem('sv-orders', JSON.stringify([...all, order]))
      } catch { /* storage may be blocked: the order still went through */ }
      setDone(order)
      items.forEach((i) => track('order_sent', i.wineId))
    } catch (err) {
      setError(String(err?.message).includes('LIMIT_3')
        ? `Нэг утасны дугаараас нэг дарсыг нийт 3 шил хүртэл захиалах боломжтой${err.details ? ` (${err.details})` : ''}.`
        : 'Илгээж чадсангүй. Интернэтээ шалгаад дахин оролдоно уу.')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(summary(done)); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* ignore */ }
  }

  return (
    <div className="modal" onClick={closeOrder}>
      <div className="order glass" ref={box} role="dialog" aria-modal="true" aria-labelledby="order-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal__x" onClick={closeOrder} aria-label="Хаах">×</button>

        <aside className="order__wine">
          <img className="order__poster" src={wine.posters?.[0]} alt={wine.name} />
        </aside>

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
            <p className="order__hint">Захиалгын дугаараа хадгална уу. Бид тантай утсаар холбогдож баталгаажуулна.</p>
            <div className="order__actions">
              <button className="btn-outline" onClick={copy}>{copied ? 'Хуулагдлаа ✓' : 'Хуулах'}</button>
              <button className="btn-primary" onClick={closeOrder}><span className="btn-primary__shine" /><span className="btn-primary__label">Хаах</span></button>
            </div>
          </div>
        ) : (
          <form className="order__form" onSubmit={submit} noValidate>
            <h3 id="order-title">Захиалга</h3>
            <p className="order__lead">Мэдээллээ үлдээгээрэй, бид тантай холбогдож баталгаажуулна.</p>

            <div className="fld">
              <label htmlFor="o-name">Нэр</label>
              <input id="o-name" ref={firstField} value={f.name} onChange={set('name')} onBlur={blur('name')} placeholder="Таны нэр" autoComplete="name" aria-invalid={!!show('name')} />
              {show('name') && <span className="fld__err">{errors.name}</span>}
            </div>

            <div className="fld">
              <label htmlFor="o-phone">Утас</label>
              <input id="o-phone" value={f.phone} onChange={set('phone')} onBlur={blur('phone')} inputMode="tel" placeholder="9911 2233" autoComplete="tel" aria-invalid={!!show('phone')} />
              {show('phone') && <span className="fld__err">{errors.phone}</span>}
            </div>

            <div className="fld">
              <label htmlFor="o-email">Имэйл <i>(заавал биш)</i></label>
              <input id="o-email" type="email" value={f.email} onChange={set('email')} onBlur={blur('email')} inputMode="email" placeholder="name@example.com" autoComplete="email" aria-invalid={!!show('email')} />
              {show('email') && <span className="fld__err">{errors.email}</span>}
            </div>

            <div className="fld">
              <label>Дарс сонгох <i>(нэг дарснаас дээд тал нь 3 шил)</i></label>
              <ul className="items">
                {WINES.map((w) => {
                  const n = qty[w.id] || 0
                  const to = (v) => setQty((q) => ({ ...q, [w.id]: Math.max(0, Math.min(MAX_QTY, v)) }))
                  return (
                    <li key={w.id} className={n ? 'on' : ''}>
                      <span className="items__name"><b>{w.name}</b><small>{w.grape}{w.year ? ` · ${w.year}` : ''}</small></span>
                      <span className="items__price">{fmtPrice(w.price)}</span>
                      <span className="qty qty--sm">
                        <button type="button" onClick={() => to(n - 1)} disabled={n === 0} aria-label={`${w.name}: хасах`}>−</button>
                        <span aria-live="polite">{n}</span>
                        <button type="button" onClick={() => to(n + 1)} disabled={n >= MAX_QTY} aria-label={`${w.name}: нэмэх`}>+</button>
                      </span>
                    </li>
                  )
                })}
              </ul>
              {touched.submit && errors.items && <span className="fld__err">{errors.items}</span>}
            </div>

            <div className="fld">
              <label htmlFor="o-note">Тэмдэглэл <i>(заавал биш)</i></label>
              <textarea id="o-note" rows="2" value={f.note} onChange={set('note')} placeholder="Бэлэг, тусгай хүсэлт г.м" />
            </div>

            <div className="order__total"><span>Нийт дүн</span><b>{fmtPrice(sum)}</b></div>

            {error && <p className="order__error" role="alert">{error}</p>}

            <button className="btn-primary order__submit" type="submit" disabled={busy}>
              <span className="btn-primary__shine" />
              <span className="btn-primary__label">{busy ? 'Илгээж байна…' : `Захиалга илгээх · ${total} шил`}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
