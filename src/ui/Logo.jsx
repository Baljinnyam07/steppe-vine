import styles from './Logo.module.css'

// Stacked STEPPE / & / VINE wordmark with the grape-cluster mark, as on the banner
// (large first letter, smaller capitals after it).
const DOTS = [
  [17, 9], [27, 9], [37, 9], [47, 9],
  [22, 19], [32, 19], [42, 19],
  [27, 29], [37, 29],
  [32, 39]
]

export default function Logo({ className = '' }) {
  return (
    <div className={`${styles.logo} ${className}`} role="img" aria-label="Steppe & Vine">
      <span className={styles.line}>S<small>TEPPE</small></span>
      <span className={styles.amp}>&amp;</span>
      <span className={styles.line}>V<small>INE</small></span>
      <svg className={styles.mark} viewBox="0 0 64 46" fill="currentColor" aria-hidden="true">
        <path d="M1 14c2-8 10-11 16-7-2 8-9 12-16 7z" />
        <path d="M63 14c-2-8-10-11-16-7 2 8 9 12 16 7z" />
        {DOTS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4.2" />)}
      </svg>
    </div>
  )
}
