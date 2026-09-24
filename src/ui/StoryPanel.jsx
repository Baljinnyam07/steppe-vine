import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { WINES } from '../data/wines'
import { useStore } from '../store'

export default function StoryPanel() {
  const { index, view, closeDetail, openOrder } = useStore()
  const wine = WINES[index]
  const root = useRef()
  const scroller = useRef()
  const open = view === 'detail'

  const first = useRef(true)

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false
      gsap.set(root.current, { xPercent: 108, rotation: 4, autoAlpha: 0 })
      return
    }
    if (open) scroller.current.scrollTop = 0
    gsap.to(root.current, {
      xPercent: open ? 0 : 108,
      rotation: open ? 0 : 4,
      autoAlpha: open ? 1 : 0,
      duration: open ? 1.2 : 0.7,
      delay: open ? 0.9 : 0,
      ease: open ? 'power3.out' : 'power2.in',
      overwrite: 'auto'
    })
  }, [open])

  return (
    <section ref={root} className="story" style={{ visibility: 'hidden' }} aria-hidden={!open}>
      <button className="story__back" onClick={closeDetail}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Буцах
      </button>

      <div className="parchment">
        <div className="parchment__paper" />
        <div className="parchment__scroll" ref={scroller}>
          <article className="parchment__body">
            <p className="eyebrow">Steppe &amp; Vine · {wine.origin}</p>
            <h2>{wine.story.title}</h2>
            <div className="orn" aria-hidden="true"><span /><i>❦</i><span /></div>

            {wine.story.paragraphs.map((p, i) => (
              <p key={i} className={i === 0 ? 'dropcap' : undefined}>{p}</p>
            ))}

            <blockquote>{wine.story.quote}</blockquote>

            <table className="facts">
              <tbody>
                <tr><th>Нэр</th><td>{wine.name}</td></tr>
                {wine.year && <tr><th>Ургацын он</th><td>{wine.year}</td></tr>}
                <tr><th>Усан үзэм</th><td>{wine.grape}</td></tr>
                <tr><th>Гарал</th><td>{wine.origin}</td></tr>
                {wine.rating && <tr><th>Үнэлгээ</th><td>{wine.rating.score} оноо · {wine.rating.source}</td></tr>}
                <tr><th>Амт</th><td>{wine.notes.join(', ')}</td></tr>
                <tr><th>Хамт</th><td>{wine.pairing}</td></tr>
              </tbody>
            </table>

            <div className="orn" aria-hidden="true"><span /><i>❦</i><span /></div>
            <button className="btn-ink" onClick={openOrder}>Захиалах</button>
            <p className="sign">— Steppe &amp; Vine дарсны танхим</p>
          </article>
        </div>
      </div>
    </section>
  )
}
