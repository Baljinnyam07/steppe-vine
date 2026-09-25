import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { WINES, fmtPrice } from '../data/wines'
import './admin.css'

/*
 * Admin window, open at /#/admin. Sign in with the Supabase user listed in `admins`
 * (see supabase/migration-admin.sql). Row-level security decides what is visible: without a valid
 * admin session every query below simply returns nothing.
 */
const STATUS = { new: 'Шинэ', confirmed: 'Баталсан', delivered: 'Хүргэгдсэн', cancelled: 'Цуцлагдсан' }
const WINE_BY_ID = Object.fromEntries(WINES.map((w) => [w.id, w]))
const fmtDate = (s) => new Date(s).toLocaleString('mn-MN', { dateStyle: 'short', timeStyle: 'short' })

function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
    if (error) setErr('Имэйл эсвэл нууц үг буруу байна')
    setBusy(false)
  }
  return (
    <form className="adm-login" onSubmit={submit}>
      <h1>Steppe &amp; Vine</h1>
      <p>Админ</p>
      <input type="email" placeholder="Имэйл" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
      <input type="password" placeholder="Нууц үг" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
      {err && <span className="adm-err">{err}</span>}
      <button disabled={busy}>{busy ? 'Нэвтэрч байна…' : 'Нэвтрэх'}</button>
    </form>
  )
}

function Orders({ rows, reload }) {
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState('')

  // rows are one per wine: group them into orders by code
  const orders = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const o = map.get(r.code) || { code: r.code, created_at: r.created_at, name: r.name, phone: r.phone, email: r.email, note: r.note, status: r.status, items: [], total: 0 }
      const price = WINE_BY_ID[r.wine_id]?.price ?? 0
      o.items.push({ wine: r.wine, qty: r.qty })
      o.total += price * r.qty
      map.set(r.code, o)
    }
    return [...map.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [rows])

  const shown = orders.filter((o) => (filter === 'all' || o.status === filter) && (!q || `${o.code} ${o.name} ${o.phone} ${o.email ?? ''}`.toLowerCase().includes(q.toLowerCase())))
  const revenue = orders.filter((o) => o.status === 'confirmed' || o.status === 'delivered').reduce((a, o) => a + o.total, 0)

  const setStatus = async (code, status) => {
    setBusy(code)
    await supabase.from('orders').update({ status }).eq('code', code)
    await reload()
    setBusy('')
  }

  const exportCsv = () => {
    const head = ['Дугаар', 'Огноо', 'Нэр', 'Утас', 'Имэйл', 'Дарс', 'Дүн', 'Төлөв', 'Тэмдэглэл']
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = shown.map((o) => [o.code, o.created_at, o.name, o.phone, o.email, o.items.map((i) => `${i.wine} x${i.qty}`).join('; '), o.total, STATUS[o.status], o.note].map(esc).join(','))
    const blob = new Blob(['﻿' + [head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <div className="adm-cards">
        <div><b>{orders.length}</b><span>Нийт захиалга</span></div>
        <div><b>{orders.filter((o) => o.status === 'new').length}</b><span>Шинэ</span></div>
        <div><b>{fmtPrice(revenue)}</b><span>Баталсан дүн</span></div>
      </div>
      <div className="adm-bar">
        <div className="adm-chips">
          {[['all', 'Бүгд'], ...Object.entries(STATUS)].map(([k, t]) => (
            <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{t}</button>
          ))}
        </div>
        <input className="adm-search" placeholder="Хайх: нэр, утас, дугаар…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="adm-ghost" onClick={exportCsv}>CSV татах</button>
      </div>
      <div className="adm-list">
        {shown.length === 0 && <p className="adm-empty">Захиалга алга</p>}
        {shown.map((o) => (
          <article key={o.code} className={`adm-order st-${o.status}`}>
            <header>
              <b>{o.code}</b>
              <time>{fmtDate(o.created_at)}</time>
              <select value={o.status} disabled={busy === o.code} onChange={(e) => setStatus(o.code, e.target.value)}>
                {Object.entries(STATUS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
              </select>
            </header>
            <div className="adm-who">
              <strong>{o.name}</strong>
              <a href={`tel:${o.phone}`}>{o.phone}</a>
              {o.email && <a href={`mailto:${o.email}`}>{o.email}</a>}
            </div>
            <ul>{o.items.map((i, k) => <li key={k}><span>{i.wine}</span><b>× {i.qty}</b></li>)}</ul>
            {o.note && <p className="adm-note">“{o.note}”</p>}
            <footer>Нийт дүн <b>{fmtPrice(o.total)}</b></footer>
          </article>
        ))}
      </div>
    </>
  )
}

function Stats({ daily, perWine }) {
  const sum = (n) => daily.slice(0, n).reduce((a, d) => a + d.visitors, 0)
  const max = Math.max(1, ...daily.slice(0, 14).map((d) => d.visitors))
  return (
    <>
      <div className="adm-cards">
        <div><b>{daily[0]?.visitors ?? 0}</b><span>Өнөөдөр орсон</span></div>
        <div><b>{sum(7)}</b><span>Сүүлийн 7 хоног</span></div>
        <div><b>{sum(30)}</b><span>Сүүлийн 30 хоног</span></div>
      </div>
      <h3 className="adm-h">Өдөр бүрийн зочин (14 хоног)</h3>
      <div className="adm-bars">
        {daily.slice(0, 14).reverse().map((d) => (
          <div key={d.day} title={`${d.day}: ${d.visitors}`}>
            <i style={{ height: `${(d.visitors / max) * 100}%` }} />
            <span>{d.day.slice(5)}</span>
          </div>
        ))}
        {daily.length === 0 && <p className="adm-empty">Өгөгдөл алга</p>}
      </div>
      <h3 className="adm-h">Дарс тус бүр</h3>
      <table className="adm-table">
        <thead><tr><th>Дарс</th><th>Нээсэн</th><th>«Захиалах»</th><th>Захиалга</th></tr></thead>
        <tbody>
          {perWine.map((r) => (
            <tr key={r.wine_id}><td>{WINE_BY_ID[r.wine_id]?.name ?? r.wine_id}</td><td>{r.views}</td><td>{r.order_clicks}</td><td>{r.orders}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function Panel({ session }) {
  const [tab, setTab] = useState('orders')
  const [rows, setRows] = useState([])
  const [daily, setDaily] = useState([])
  const [perWine, setPerWine] = useState([])
  const [state, setState] = useState('loading') // loading | ok | denied

  const load = useCallback(async () => {
    const o = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(2000)
    const d = await supabase.from('daily_stats').select('*').limit(60)
    const w = await supabase.from('wine_stats').select('*')
    if (o.error) { setState('denied'); return }
    setRows(o.data || []); setDaily(d.data || []); setPerWine(w.data || [])
    setState('ok')
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div className="adm-wrap">
      <header className="adm-top">
        <h1>Steppe &amp; Vine <small>админ</small></h1>
        <nav>
          <button className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}>Захиалгууд</button>
          <button className={tab === 'stats' ? 'on' : ''} onClick={() => setTab('stats')}>Статистик</button>
        </nav>
        <div className="adm-right">
          <button className="adm-ghost" onClick={load}>Шинэчлэх</button>
          <button className="adm-ghost" onClick={() => supabase.auth.signOut()}>Гарах</button>
        </div>
      </header>
      <p className="adm-user">{session.user.email}</p>
      {state === 'loading' && <p className="adm-empty">Ачаалж байна…</p>}
      {state === 'denied' && <p className="adm-err">Энэ хэрэглэгч админ эрхгүй байна. supabase/migration-admin.sql дотор имэйлээ нэмсэн эсэхээ шалгана уу.</p>}
      {state === 'ok' && (tab === 'orders' ? <Orders rows={rows} reload={load} /> : <Stats daily={daily} perWine={perWine} />)}
    </div>
  )
}

export default function Admin() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    document.title = 'Админ — Steppe & Vine'
    const meta = document.createElement('meta')
    meta.name = 'robots'; meta.content = 'noindex,nofollow'
    document.head.appendChild(meta)
    if (!supabase) return () => meta.remove()
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => { data.subscription.unsubscribe(); meta.remove() }
  }, [])

  if (!supabase) return <div className="adm-root"><p className="adm-err">Supabase холбогдоогүй байна (.env дахь VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).</p></div>
  return <div className="adm-root">{session === undefined ? <p className="adm-empty">…</p> : session ? <Panel session={session} /> : <Login />}</div>
}
