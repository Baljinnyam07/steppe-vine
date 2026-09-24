import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { WINES } from '../data/wines'
import { useStore } from '../store'

// Front-end only: wire `submit` to your API / checkout when ready.
export default function OrderModal() {
  const { orderOpen, closeOrder, index } = useStore()
  const wine = WINES[index]
  const [qty, setQty] = useState(1)
  const [sent, setSent] = useState(false)
  const box = useRef()

  useEffect(() => {
    if (orderOpen) {
      setSent(false)
      gsap.fromTo(box.current, { autoAlpha: 0, y: 24, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' })
    }
  }, [orderOpen])

  if (!orderOpen) return null

  const submit = (e) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="modal" onClick={closeOrder}>
      <div className="modal__box glass" ref={box} onClick={(e) => e.stopPropagation()}>
        <button className="modal__x" onClick={closeOrder} aria-label="Хаах">×</button>
        {sent ? (
          <div className="modal__done">
            <h3>Баярлалаа!</h3>
            <p>{wine.name} {wine.year} — {qty} шилний захиалга хүлээн авлаа. Бид тантай удахгүй холбогдоно.</p>
            <button className="btn-outline" onClick={closeOrder}>Хаах</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h3>Захиалга</h3>
            <p className="modal__wine">{wine.name} · {wine.grape} · {wine.year}</p>
            <label>Нэр<input required placeholder="Таны нэр" /></label>
            <label>Утас<input required inputMode="tel" placeholder="9911 2233" /></label>
            <label>
              Тоо ширхэг
              <div className="qty">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty(qty + 1)}>+</button>
              </div>
            </label>
            <button className="btn-primary" type="submit"><span className="btn-primary__shine" /><span className="btn-primary__label">Захиалга илгээх</span></button>
          </form>
        )}
      </div>
    </div>
  )
}
