// − 2 + control for a number of bottles (0..max). Uses the .qty styles from styles.css.
export default function Stepper({ qty, onChange, max = 3, label = '' }) {
  return (
    <span className="qty qty--sm">
      <button type="button" onClick={() => onChange(qty - 1)} disabled={qty <= 0} aria-label={`${label} хасах`}>−</button>
      <span aria-live="polite">{qty}</span>
      <button type="button" onClick={() => onChange(qty + 1)} disabled={qty >= max} aria-label={`${label} нэмэх`}>+</button>
    </span>
  )
}
