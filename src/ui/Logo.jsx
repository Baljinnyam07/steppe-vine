import styles from './Logo.module.css'

// Brand logo: /public/logo.png (stacked STEPPE & VINE wordmark with the grape mark).
export default function Logo({ className = '' }) {
  return <img className={`${styles.logo} ${className}`} src="/logo.png" alt="Steppe & Vine" draggable="false" />
}
