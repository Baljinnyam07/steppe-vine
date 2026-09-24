import * as THREE from 'three'

const canvas = (w, h) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

const toTexture = (c, { repeat = true } = {}) => {
  // (bump/grain textures pass {} to keep repeat wrapping; the wall passes repeat:false)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

// Deterministic pseudo random so textures look the same on every load.
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

let grain
/** Fine plaster / stone grain used as a bump map on the wall and floor. */
export function getGrainBump() {
  if (grain) return grain
  const c = canvas(512, 512)
  const g = c.getContext('2d')
  const r = rng(23)
  g.fillStyle = '#808080'
  g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 14000; i++) {
    const v = 60 + r() * 140
    g.fillStyle = `rgba(${v},${v},${v},0.5)`
    g.fillRect(r() * 512, r() * 512, 1 + r() * 4, 1 + r() * 4)
  }
  grain = toTexture(c, {})
  return grain
}

let wall
/** Warm tan plaster wall with diagonal leaf-shadow dapples from the upper left (banner look). */
export function getWallTexture() {
  if (wall) return wall
  const c = canvas(2048, 1152)
  const g = c.getContext('2d')
  const r = rng(5)
  const base = g.createLinearGradient(0, 0, 2048, 1152)
  base.addColorStop(0, '#d2b592')
  base.addColorStop(0.5, '#c9a882')
  base.addColorStop(1, '#bd9a74')
  g.fillStyle = base
  g.fillRect(0, 0, 2048, 1152)
  // plaster grain
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? '255,240,215' : '110,80,50'},${r() * 0.05})`
    g.fillRect(r() * 2048, r() * 1152, 2 + r() * 5, 2 + r() * 5)
  }
  const blur = 'filter' in g
  const leaf = (x, y, s, a, alpha) => {
    g.save()
    g.translate(x, y)
    g.rotate(a)
    g.fillStyle = `rgba(112,74,44,${alpha})`
    g.beginPath()
    g.ellipse(0, 0, s, s * 0.3, 0, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  if (blur) g.filter = 'blur(13px)'
  // sunlight through foliage: a band of leaf shadows running from the top-left down to the right
  for (let i = 0; i < 90; i++) {
    const u = r()
    const x = u * 1250 + (r() - 0.5) * 420
    const y = u * 560 + (r() - 0.3) * 520
    const fade = Math.max(0.2, 1 - u * 0.75)
    leaf(x, y, 60 + r() * 120, -0.9 + (r() - 0.5) * 1.6, (0.16 + r() * 0.26) * fade)
  }
  g.strokeStyle = 'rgba(112,74,44,0.22)'
  g.lineWidth = 20
  for (let i = 0; i < 5; i++) {
    g.beginPath()
    g.moveTo(-40, 40 + i * 130)
    g.quadraticCurveTo(350 + r() * 200, 60 + i * 110, 820 + r() * 220, 380 + i * 60)
    g.stroke()
  }
  if (blur) g.filter = 'none'
  // where the wall meets the floor (world y = 0 is ~85% down): fade into the floor tone + a soft dark line
  const seam = 983
  const fade = g.createLinearGradient(0, seam - 200, 0, seam)
  fade.addColorStop(0, 'rgba(205,176,139,0)')
  fade.addColorStop(1, 'rgba(205,176,139,0.85)')
  g.fillStyle = fade
  g.fillRect(0, seam - 200, 2048, 200)
  const line = g.createLinearGradient(0, seam - 26, 0, seam + 4)
  line.addColorStop(0, 'rgba(90,58,30,0)')
  line.addColorStop(1, 'rgba(90,58,30,0.22)')
  g.fillStyle = line
  g.fillRect(0, seam - 26, 2048, 30)
  return toTexture(c, { repeat: false })
}

// Generated label wrapped around the bottle. Redrawn once web fonts are ready (see Bottle.jsx).
export function makeLabelTexture(wine) {
  const c = canvas(660, 600)
  const g = c.getContext('2d')
  const r = rng((wine.year ?? 7) * 7 + wine.name.length)
  const ink = wine.labelInk
  g.clearRect(0, 0, 660, 600)

  if (wine.labelBg) {
    const paper = g.createLinearGradient(0, 0, 660, 600)
    paper.addColorStop(0, wine.labelBg)
    paper.addColorStop(1, '#d6c59a')
    g.fillStyle = paper
    g.fillRect(0, 0, 660, 600)
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = `rgba(90,60,20,${r() * 0.07})`
      g.fillRect(r() * 660, r() * 600, 2, 2)
    }
    g.strokeStyle = wine.label
    g.lineWidth = 5
    g.strokeRect(26, 26, 608, 548)
    g.lineWidth = 2
    g.strokeRect(42, 42, 576, 516)
  }

  g.textAlign = 'center'
  g.fillStyle = ink
  g.font = '500 26px "EB Garamond", Georgia, serif'
  g.fillText(wine.origin.split(',')[0].toUpperCase().split('').join(' '), 330, 108)
  g.fillStyle = wine.label
  g.fillRect(250, 128, 160, 3)

  let size = wine.labelBg ? 78 : 130
  g.fillStyle = ink
  g.font = `700 ${size}px "Playfair Display", Georgia, serif`
  while (g.measureText(wine.name).width > 520 && size > 28) {
    size -= 4
    g.font = `700 ${size}px "Playfair Display", Georgia, serif`
  }
  g.fillText(wine.name, 330, wine.labelBg ? 245 : 290)

  g.font = 'italic 500 36px "EB Garamond", Georgia, serif'
  g.fillText(wine.grape, 330, wine.labelBg ? 315 : 360)
  if (wine.sub) {
    g.font = '500 24px "EB Garamond", Georgia, serif'
    g.fillText(wine.sub.toUpperCase(), 330, wine.labelBg ? 375 : 415)
  }
  if (wine.year) {
    g.fillStyle = wine.label
    g.font = '700 100px "Playfair Display", Georgia, serif'
    g.fillText(String(wine.year), 330, 500)
  }
  return toTexture(c)
}

let blob
/** Radial falloff (alpha) for the dark contact patch where a bottle stands on its stone. */
export function getBlobTexture() {
  if (blob) return blob
  const c = canvas(128, 128)
  const g = c.getContext('2d')
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62)
  gr.addColorStop(0, 'rgba(0,0,0,1)')
  gr.addColorStop(0.45, 'rgba(0,0,0,0.55)')
  gr.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 128, 128)
  blob = toTexture(c, { repeat: false })
  return blob
}

let softRect
/** Blurred rounded rectangle (alpha) for the ambient-occlusion shadow a block leaves on what it stands on. */
export function getSoftRectTexture() {
  if (softRect) return softRect
  const c = canvas(256, 256)
  const g = c.getContext('2d')
  if ('filter' in g) g.filter = 'blur(14px)'
  g.fillStyle = '#000'
  g.beginPath()
  g.roundRect ? g.roundRect(52, 52, 152, 152, 18) : g.rect(52, 52, 152, 152)
  g.fill()
  softRect = toTexture(c, { repeat: false })
  return softRect
}
