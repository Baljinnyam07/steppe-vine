// Ragged, burnt paper edge: displaces the parchment background by fractal noise.
export default function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="burn-edge" x="-5%" y="-3%" width="110%" height="106%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.022" numOctaves="5" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="16" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  )
}
