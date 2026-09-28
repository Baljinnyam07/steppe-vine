// Device tier. Phones and weak machines get a lighter scene: fewer / cheaper transparent layers, a smaller
// shadow map, no caustic pass, lower pixel ratio. (The Canvas also lowers its resolution on the fly if the
// frame rate drops: see PerformanceMonitor in Experience.jsx.)
const mm = (q) => typeof window !== 'undefined' && window.matchMedia && window.matchMedia(q).matches
export const PHONE = mm('(max-width: 820px)')
export const LOW = PHONE || (typeof navigator !== 'undefined' && ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4))
