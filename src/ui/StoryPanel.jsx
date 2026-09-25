import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { WINES, fmtPrice } from '../data/wines'
import { useStore } from '../store'

// Sentence-level spans: each sentence fades in on its own (cheap: opacity only, ~25 elements).
function Sentences({ text }) {
  return text.split(/(?<=[.!?…])\s+/).map((t, i, a) => (
    <span key={i} className="w">{t}{i < a.length - 1 ? ' ' : ''}</span>
  ))
}

// Icons: 24x24 line icons. `Ico` puts one in a round medallion (section headings), `Fi` is the small
// inline version used in the facts grid.
const Icon = {
  scroll: <path d="M7 4h11a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2zM5 17a3 3 0 0 0 3 3M10 9h7M10 13h7" />,
  award: <path d="M12 3a5.2 5.2 0 1 0 0 10.4A5.2 5.2 0 0 0 12 3zM9 12.6 7.6 21l4.4-2.4 4.4 2.4-1.4-8.4M12 6l1.1 2.3 2.5.3-1.8 1.7.5 2.5L12 11.6l-2.3 1.2.5-2.5-1.8-1.7 2.5-.3z" />,
  glass: <path d="M8 3h8l-.5 6.2a3.5 3.5 0 0 1-7 0L8 3zM12 12.7V20M8.5 20.5h7M8.3 7.2h7.4" />,
  fork: <path d="M6 3v6a2 2 0 0 0 2 2v10M10 3v6a2 2 0 0 1-2 2M8 3v6M17 21V3c-2.2 1.6-3.4 4.4-3.4 8.4H17" />,
  calendar: <path d="M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4" />,
  drop: <path d="M12 3s6 6.3 6 10.6a6 6 0 0 1-12 0C6 9.3 12 3 12 3zM9.5 14.5a2.6 2.6 0 0 0 2 2" />,
  leaf: <path d="M5 19c0-8.5 5-14 15-14 0 9.5-5.2 15.2-14 14M5 19c3-4.4 6.4-7.4 10.4-9" />,
  pin: <path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10zM12 8.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z" />
}
const Svg = ({ n, size }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{Icon[n]}</svg>
)
const Ico = ({ n }) => <span className="ico"><Svg n={n} size={20} /></span>
const Fi = ({ n }) => <span className="fi"><Svg n={n} size={17} /></span>

// Score medal: a laurel wreath around the number.
function Medal({ score }) {
  const leaves = []
  for (let k = 0; k < 8; k++) {
    const a = (108 + k * 19) * (Math.PI / 180) // left branch, bottom -> top
    const x = 80 + Math.cos(a) * 58, y = 84 + Math.sin(a) * 58
    const rot = (a * 180) / Math.PI + 90
    leaves.push(<ellipse key={`l${k}`} cx={x} cy={y} rx="11" ry="4.6" transform={`rotate(${rot} ${x} ${y})`} />)
    const bx = 160 - x
    leaves.push(<ellipse key={`r${k}`} cx={bx} cy={y} rx="11" ry="4.6" transform={`rotate(${-rot} ${bx} ${y})`} />)
  }
  return (
    <svg className="medal" viewBox="0 0 160 160" aria-hidden="true">
      <circle cx="80" cy="82" r="47" className="medal__ring" />
      <g className="medal__leaves">{leaves}</g>
      <text x="80" y="92" textAnchor="middle" className="medal__num">{score}</text>
      <text x="80" y="112" textAnchor="middle" className="medal__cap">ОНОО</text>
    </svg>
  )
}

const GRAPES = [[17, 9], [27, 9], [37, 9], [47, 9], [22, 19], [32, 19], [42, 19], [27, 29], [37, 29], [32, 39]]
const Grapes = ({ className }) => (
  <svg className={className} viewBox="0 0 64 46" fill="currentColor" aria-hidden="true">
    <path d="M1 14c2-8 10-11 16-7-2 8-9 12-16 7z" /><path d="M63 14c-2-8-10-11-16-7 2 8 9 12 16 7z" />
    {GRAPES.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4.2" />)}
  </svg>
)

/**
 * Right half of the detail view: an aged, burnt-edge parchment with the wine's story, expert score,
 * taste and pairing. On open the paper fades in softly (opacity 0 -> 100), then the text surfaces block
 * by block, sentence by sentence (only opacity / translate are animated: no blur filters, so it stays smooth).
 */
export default function StoryPanel() {
  const { index, view, closeDetail, openOrder } = useStore()
  const wine = WINES[index]
  const root = useRef()
  const scroller = useRef()
  const first = useRef(true)
  const open = view === 'detail'

  useLayoutEffect(() => {
    const el = root.current
    if (first.current) {
      first.current = false
      gsap.set(el, { autoAlpha: 0 })
      return
    }
    const blocks = el.querySelectorAll('.rv')
    const sents = el.querySelectorAll('.w')
    gsap.killTweensOf([el, blocks, sents])

    if (!open) {
      gsap.to(el, { autoAlpha: 0, duration: 0.7, ease: 'sine.inOut' })
      return
    }

    // The paper fades in slowly from opacity 0 to 100 (with a tiny rise), and only then does the text
    // surface, block by block and sentence by sentence.
    scroller.current.scrollTop = 0
    gsap.set(blocks, { opacity: 0, y: 14 })
    gsap.set(sents, { opacity: 0 })
    gsap.set(el, { autoAlpha: 0, y: 18 })
    const tl = gsap.timeline({ delay: 0.8 })
    tl.to(el, { autoAlpha: 1, y: 0, duration: 1.8, ease: 'sine.inOut' }, 0)
      .to(blocks, { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out', stagger: 0.12 }, 1.2)
      .to(sents, { opacity: 1, duration: 1.0, ease: 'sine.out', stagger: 0.14 }, 1.4)
  }, [open])

  const paras = wine.story.paragraphs
  const [quoteText, quoteWho] = wine.story.quote.split(' — ')
  const pairing = wine.pairing.split(',').map((t) => t.trim()).filter(Boolean).map((t) => t.charAt(0).toUpperCase() + t.slice(1))

  return (
    <section ref={root} className="story" style={{ visibility: 'hidden' }} aria-hidden={!open}>
      <button className="story__back" onClick={closeDetail}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Буцах
      </button>

      <div className="parchment">
        <div className="parchment__sheet">
          <div className="parchment__paper" />
          <Grapes className="parchment__wm" />
          <div className="parchment__frame" />
        </div>
        <div className="parchment__scroll" ref={scroller}>
          <article className="parchment__body" key={wine.id}>
            <header className="story-head rv">
              <p className="eyebrow">Steppe &amp; Vine · {wine.origin}</p>
              <h2>{wine.name}</h2>
              <p className="story-sub">{wine.grape}{wine.year ? ` · ${wine.year}` : ''}</p>
              <div className="orn" aria-hidden="true"><span /><i>❦</i><span /></div>
              <p className="story-title">{wine.story.title}</p>
            </header>

            <section className="rv hist">
              <h3 className="sec"><Ico n="scroll" />Түүхэн замнал</h3>
              {paras.map((p, i) => (
                <p key={i} className={i === 0 && /^\p{L}/u.test(p) ? 'lead' : undefined}><Sentences text={p} /></p>
              ))}
            </section>

            <section className="rv score-block">
              <h3 className="sec"><Ico n="award" />Экспертийн үнэлгээ</h3>
              <div className="score-row">
                {wine.rating && <Medal score={wine.rating.score} />}
                <figure>
                  <span className="qmark" aria-hidden="true">“</span>
                  <blockquote><Sentences text={quoteText} /></blockquote>
                  <figcaption>— {quoteWho ? quoteWho.replace(/,?\s*\d[\d–-]* оноо$/, '') : wine.rating?.source}</figcaption>
                </figure>
              </div>
            </section>

            <div className="two-col">
              <section className="card rv">
                <h3 className="sec"><Ico n="glass" />Амт</h3>
                <p><Sentences text={wine.tasting} /></p>
                <ul className="notes">{wine.notes.map((n) => <li key={n}>{n}</li>)}</ul>
              </section>
              <section className="card rv">
                <h3 className="sec"><Ico n="fork" />Зохицол</h3>
                <ul className="pair">{pairing.map((t) => <li key={t}>{t}</li>)}</ul>
              </section>
            </div>

            <dl className="facts-grid rv">
              <div><dt><Fi n="calendar" />Ургацын он</dt><dd>{wine.year ?? '—'}</dd></div>
              <div><dt><Fi n="drop" />Ангилал</dt><dd>{wine.kind}</dd></div>
              <div><dt><Fi n="leaf" />Усан үзэм</dt><dd>{wine.grape}</dd></div>
              <div><dt><Fi n="pin" />Гарал</dt><dd>{wine.origin}</dd></div>
            </dl>

            <div className="price-block rv">
              <span className="price-block__label">Нэг лонхны үнэ</span>
              <b className="price-block__num">{fmtPrice(wine.price)}</b>
              <em className="price-block__tag">{wine.tagline}</em>
            </div>

            <footer className="story-foot rv">
              <div className="orn" aria-hidden="true"><span /><i>❦</i><span /></div>
              <div className="seal" aria-hidden="true"><Grapes className="seal__mark" /></div>
              <button className="btn-ink" onClick={openOrder}>Захиалах</button>
              <p className="sign">— Steppe &amp; Vine дарсны танхим</p>
            </footer>
          </article>
        </div>
      </div>
    </section>
  )
}
