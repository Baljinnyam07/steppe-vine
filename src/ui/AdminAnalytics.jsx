import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { WINES, fmtPrice } from '../data/wines'

/*
 * Analytics for the admin window. Loads the raw events of the chosen period and computes everything here:
 * audience, sources, the funnel (where visitors stop), what they look at, per-wine performance, hours.
 */
const RANGES = [[1, 'Өнөөдөр'], [7, '7 хоног'], [30, '30 хоног'], [90, '90 хоног']]
const NAME = Object.fromEntries(WINES.map((w) => [w.id, w.name]))
const STAGE_LABEL = { landing: 'Зөвхөн нүүр хуудас үзсэн', wine: 'Дарс нээж үзсэн', cart_add: 'Сагсанд нэмсэн', cart_open: 'Сагс нээсэн', form: 'Форм бөглөж эхэлсэн', order: 'Захиалга өгсөн' }
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)
const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0)
const median = (xs) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
const dur = (s) => (s >= 60 ? `${Math.floor(s / 60)}м ${s % 60}с` : `${s}с`)
const uniq = (arr) => new Set(arr).size
const count = (arr, f) => { const m = {}; for (const x of arr) { const k = f(x); m[k] = (m[k] || 0) + 1 } return m }

async function load(days) {
  const since = new Date(Date.now() - (days === 1 ? 0 : days) * 86400000)
  if (days === 1) since.setHours(0, 0, 0, 0)
  const out = []
  for (let from = 0; from < 40000; from += 1000) {
    const { data, error } = await supabase.from('events')
      .select('type,wine_id,session_id,visitor_id,device,source,meta,created_at')
      .gte('created_at', since.toISOString()).order('created_at', { ascending: true }).range(from, from + 999)
    if (error) return { error }
    out.push(...data)
    if (data.length < 1000) break
  }
  return { data: out }
}

const Bars = ({ rows, max, fmt = (v) => v }) => {
  const m = max || Math.max(1, ...rows.map((r) => r.v))
  return (
    <div className="an-list">
      {rows.length === 0 && <p className="adm-empty">Өгөгдөл алга</p>}
      {rows.map((r) => (
        <div key={r.k} className="an-row" title={r.hint || ''}>
          <span className="an-row__k">{r.k}</span>
          <span className="an-row__bar"><i style={{ width: `${Math.max(2, (r.v / m) * 100)}%` }} /></span>
          <b>{fmt(r.v)}{r.sub ? <small> {r.sub}</small> : null}</b>
        </div>
      ))}
    </div>
  )
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(30)
  const [ev, setEv] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let live = true
    setEv(null); setErr('')
    load(days).then((r) => { if (!live) return; if (r.error) setErr(r.error.message); else setEv(r.data) })
    return () => { live = false }
  }, [days])

  const A = useMemo(() => {
    if (!ev) return null
    const by = (t) => ev.filter((e) => e.type === t)
    const visits = by('visit')
    const sessions = uniq(visits.map((e) => e.session_id))
    const sess = (t, f = () => true) => uniq(by(t).filter(f).map((e) => e.session_id))

    const funnel = [
      ['Сайтад орсон', sessions],
      ['Дарс нээж үзсэн', sess('open_wine')],
      ['Сагсанд нэмсэн', sess('add_to_cart')],
      ['Сагс нээсэн', sess('open_order', (e) => !e.meta?.empty)],
      ['Форм бөглөж эхэлсэн', sess('form_start')],
      ['Захиалга өгсөн', sess('order_sent')]
    ]

    // where each visit stopped: its last "leave" event
    const lastLeave = {}
    for (const e of by('leave')) lastLeave[e.session_id] = e
    const stops = count(Object.values(lastLeave), (e) => e.meta?.stage || 'landing')
    const secs = Object.values(lastLeave).map((e) => Math.min(e.meta?.secs ?? 0, 1800)).filter((s) => s >= 0)

    const scrollSess = {}
    for (const e of by('scroll')) (scrollSess[e.meta?.pct] ||= new Set()).add(e.session_id)

    const devices = count(visits, (e) => e.device || '?')
    const sources = count(visits, (e) => e.source || 'direct')
    const returning = visits.filter((e) => e.meta?.returning).length

    const dayKey = (e) => new Date(new Date(e.created_at).getTime() + 8 * 3600000).toISOString().slice(0, 10) // Ulaanbaatar time
    const perDay = {}
    for (const e of visits) (perDay[dayKey(e)] ||= new Set()).add(e.session_id)
    const hours = Array(24).fill(0)
    for (const e of visits) hours[(new Date(e.created_at).getUTCHours() + 8) % 24]++

    const wines = WINES.map((w) => {
      const of = (t) => ev.filter((e) => e.type === t && e.wine_id === w.id)
      const dw = of('wine_dwell').map((e) => Math.min(e.meta?.secs ?? 0, 900))
      const orders = of('order_sent')
      const views = of('open_wine')
      return {
        id: w.id, name: w.name, views: views.length, viewers: uniq(views.map((e) => e.session_id)),
        dwell: avg(dw), zooms: of('zoom_poster').length, gallery: of('gallery_page').length,
        adds: of('add_to_cart').length, removes: of('remove_from_cart').length,
        orders: orders.length, bottles: orders.reduce((a, e) => a + (e.meta?.qty || 1), 0),
        revenue: orders.reduce((a, e) => a + (e.meta?.qty || 1) * w.price, 0)
      }
    })

    const addSess = new Set(by('add_to_cart').map((e) => e.session_id))
    const orderSess = new Set(by('order_sent').map((e) => e.session_id))
    const abandoned = [...addSess].filter((s) => !orderSess.has(s)).length
    const now = Date.now()
    const live = uniq(ev.filter((e) => now - new Date(e.created_at) < 30 * 60000).map((e) => e.session_id))

    return {
      sessions, visitors: uniq(visits.map((e) => e.visitor_id)), returning, funnel, stops, secs, scrollSess, devices, sources,
      perDay, hours, wines, abandoned, live,
      orders: uniq(by('order_sent').map((e) => e.meta?.code || e.session_id)),
      formErrors: by('form_error').length, failed: by('order_failed').length,
      social: count(by('click_social'), (e) => e.meta?.to || '?'),
      revenue: wines.reduce((a, w) => a + w.revenue, 0), total: ev.length
    }
  }, [ev])

  const dayRows = useMemo(() => {
    if (!A) return []
    const n = Math.min(days === 1 ? 1 : days, 30)
    const out = []
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(Date.now() + 8 * 3600000 - i * 86400000).toISOString().slice(0, 10)
      out.push({ k: d.slice(5), v: A.perDay[d]?.size || 0 })
    }
    return out
  }, [A, days])

  return (
    <div className="an">
      <div className="an-bar">
        <div className="adm-chips">
          {RANGES.map(([d, t]) => <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{t}</button>)}
        </div>
        {A && <span className="an-live"><i />{A.live} хүн сүүлийн 30 минутад</span>}
      </div>

      {err && <p className="adm-err">Уншиж чадсангүй: {err}. Supabase дээр migration-analytics.sql ажиллуулсан эсэхээ шалгана уу.</p>}
      {!A && !err && <p className="adm-empty">Ачаалж байна…</p>}

      {A && A.sessions === 0 && <p className="adm-empty">Энэ хугацаанд өгөгдөл алга. Сайтад хэн ч орсонгүй, эсвэл шинэ тоолол хараахан ажиллаагүй байна.</p>}

      {A && A.sessions > 0 && (
        <>
          <div className="adm-cards">
            <div><b>{A.sessions}</b><span>Зочин (хандалт)</span></div>
            <div><b>{A.visitors}</b><span>Давхардаагүй хүн · {pct(A.returning, A.sessions)}% буцаж ирсэн</span></div>
            <div><b>{dur(median(A.secs))}</b><span>Дундаж хугацаа (median) · дундаж {dur(avg(A.secs))}</span></div>
            <div><b>{A.orders}</b><span>Захиалга · {pct(A.orders, A.sessions)}% хувиргалт</span></div>
            <div><b>{fmtPrice(A.revenue)}</b><span>Захиалгын дүн (нийт)</span></div>
            <div><b>{A.abandoned}</b><span>Сагсанд нэмээд захиалаагүй</span></div>
          </div>

          <h3 className="adm-h">Хүн хаана хүрээд зогсож байна? (funnel)</h3>
          <div className="an-funnel">
            {A.funnel.map(([label, n], i) => {
              const prev = i ? A.funnel[i - 1][1] : n
              return (
                <div key={label} className="an-step">
                  <div className="an-step__top"><span>{label}</span><b>{n}</b></div>
                  <span className="an-step__bar"><i style={{ width: `${Math.max(2, pct(n, A.funnel[0][1]))}%` }} /></span>
                  <small>{pct(n, A.funnel[0][1])}% нийтээс{i ? ` · өмнөх алхмаас ${pct(n, prev)}% (${prev - n} хүн гарсан)` : ''}</small>
                </div>
              )
            })}
          </div>

          <div className="an-grid">
            <section>
              <h3 className="adm-h">Сүүлд юу хийгээд гарсан бэ?</h3>
              <Bars rows={Object.entries(A.stops).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k: STAGE_LABEL[k] || k, v, sub: `${pct(v, Object.values(A.stops).reduce((a, b) => a + b, 0))}%` }))} />
            </section>
            <section>
              <h3 className="adm-h">Хуудсыг хэр гүйлгэсэн бэ?</h3>
              <Bars max={A.sessions} rows={[25, 50, 75, 100].map((m) => ({ k: `${m}% хүртэл`, v: A.scrollSess[m]?.size || 0, sub: `${pct(A.scrollSess[m]?.size || 0, A.sessions)}%` }))} />
            </section>
            <section>
              <h3 className="adm-h">Хаанаас ирсэн бэ?</h3>
              <Bars rows={Object.entries(A.sources).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, v, sub: `${pct(v, A.sessions)}%` }))} />
            </section>
            <section>
              <h3 className="adm-h">Төхөөрөмж</h3>
              <Bars rows={Object.entries(A.devices).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k: { mobile: 'Утас', tablet: 'Таблет', desktop: 'Компьютер' }[k] || k, v, sub: `${pct(v, A.sessions)}%` }))} />
            </section>
          </div>

          <h3 className="adm-h">Аль дарсыг хамгийн их ашиглаж, сонирхож байна вэ?</h3>
          <div className="adm-tablewrap">
            <table className="adm-table an-table">
              <thead><tr><th>Дарс</th><th>Үзсэн</th><th>Дундаж хугацаа</th><th>Постер томруулсан</th><th>Зураг шударсан</th><th>Сагсанд</th><th>Хассан</th><th>Захиалга (шил)</th><th>Дүн</th><th>Нэмсэн → захиалга</th></tr></thead>
              <tbody>
                {[...A.wines].sort((a, b) => b.views - a.views).map((w) => (
                  <tr key={w.id}>
                    <td><b>{w.name}</b></td><td>{w.views}<small> ({w.viewers} хүн)</small></td><td>{w.dwell ? dur(w.dwell) : '—'}</td><td>{w.zooms}</td><td>{w.gallery}</td>
                    <td>{w.adds}</td><td>{w.removes}</td><td>{w.orders}{w.bottles ? <small> ({w.bottles} шил)</small> : null}</td><td>{w.revenue ? fmtPrice(w.revenue) : '—'}</td><td>{w.adds ? `${pct(w.orders, w.adds)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="an-grid">
            <section>
              <h3 className="adm-h">Өдөр бүрийн хандалт</h3>
              <div className="adm-bars">
                {dayRows.map((d) => { const m = Math.max(1, ...dayRows.map((x) => x.v)); return <div key={d.k} title={`${d.k}: ${d.v}`}><i style={{ height: `${(d.v / m) * 100}%` }} /><span>{dayRows.length > 14 ? '' : d.k}</span></div> })}
              </div>
            </section>
            <section>
              <h3 className="adm-h">Цагаар (Улаанбаатар)</h3>
              <div className="adm-bars">
                {A.hours.map((v, h) => { const m = Math.max(1, ...A.hours); return <div key={h} title={`${h}:00 — ${v}`}><i style={{ height: `${(v / m) * 100}%` }} /><span>{h % 6 === 0 ? h : ''}</span></div> })}
              </div>
            </section>
          </div>

          <div className="an-grid">
            <section>
              <h3 className="adm-h">Захиалгын формын асуудал</h3>
              <Bars rows={[
                { k: 'Форм бөглөж эхэлсэн', v: A.funnel[4][1] },
                { k: 'Алдаатай илгээх оролдлого', v: A.formErrors },
                { k: 'Илгээгдээгүй (сүлжээ / хязгаар)', v: A.failed }
              ]} />
            </section>
            <section>
              <h3 className="adm-h">Сошиал холбоос дарсан</h3>
              <Bars rows={Object.entries(A.social).map(([k, v]) => ({ k, v }))} />
            </section>
          </div>
          <p className="adm-user">Нийт {A.total} бүртгэл. Хүн бүр нэргүй, санамсаргүй дугаараар л тоологдоно.</p>
        </>
      )}
    </div>
  )
}
