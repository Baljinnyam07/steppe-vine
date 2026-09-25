import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import Experience from './three/Experience'
import Logo from './ui/Logo'
import { useStore } from './store'
import styles from './WineMainBoard.module.css'

/**
 * Landing view = the banner: brand at the left, all bottles on stone pedestals at the right.
 * Clicking a bottle calls store.openDetail(i); three/anim.js then flies the camera in and
 * hands over to the detail view (StoryPanel).
 */
export default function WineMainBoard() {
  const view = useStore((s) => s.view)
  const root = useRef()

  // Fade the overlay out for the detail view and back in on return.
  useLayoutEffect(() => {
    const detail = view === 'detail'
    gsap.to(gsap.utils.selector(root)('[data-fade]'), {
      autoAlpha: detail ? 0 : 1,
      y: detail ? 12 : 0,
      duration: detail ? 0.5 : 0.7,
      delay: detail ? 0 : 1.0,
      stagger: 0.05,
      ease: 'power2.out',
      overwrite: true
    })
    root.current.style.pointerEvents = detail ? 'none' : ''
  }, [view])

  return (
    <>
      <Experience />
      <div className={styles.vignette} />
      <div className={styles.grain} />

      <div ref={root} className={styles.overlay}>
        <div className={styles.hero} data-fade>
          <Logo />
          <p className={styles.tagline}>
            Authentic wines from<br /><em>Napa Valley, California</em>
          </p>
        </div>
      </div>
    </>
  )
}
