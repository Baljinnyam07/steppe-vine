import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils } from 'three'
import { WINES } from '../data/wines'
import { useStore } from '../store'
import { anim, computeLayout } from './anim'
import WineSlot from './WineSlot'
import { StoneBlock } from './Plinth'
import { getSoftRectTexture } from './textures'
import Fog from './Fog'
import Props from './Props'

const { lerp, smootherstep } = MathUtils

// Stepped stone platform modelled on the banner. Everything stands on one thick base slab:
//   front row (z ~ 0.8): three wide blocks that butt against each other with a hairline seam
//     (pitted travertine slab | smooth plain step | rough sandstone slab)
//   back row (z ~ -0.75): taller blocks rising behind them.
// [x, z] is where the bottle stands, `h` the block height, `stone.dx` the block centre offset from
// the bottle. Blocks touch but never intersect: keep a >= 0.03 seam between neighbours.
//   front x-ranges: [-3.35, -0.87]  [-0.84, 0.54]  [0.57, 3.10]
const LEDGE_H = 0.24
const LEDGE = { w: 8.0, d: 3.6, x: -0.2, z: 0.1 }
const LEDGE_M = { w: 4.3, d: 3.3, x: 0, z: 0.05 }
const PLACES = [
  { x: -2.95, z: -0.75, h: 0.95, stone: { seed: 6, w: 1.1,  d: 1.1, dx: 0,      kind: 'travertine', tint: '#fbf1e8' } }, // back, left
  { x: -1.87, z: 0.8,   h: 0.42, stone: { seed: 1, w: 2.48, d: 1.4, dx: -0.24,  kind: 'travertine', tint: '#fff8f0' } }, // front: long pitted slab
  { x: -1.03, z: -0.75, h: 1.2,  stone: { seed: 2, w: 1.0,  d: 1.0, dx: 0,      kind: 'travertine', tint: '#f6ece2' } }, // back: tall cube
  { x: -0.15, z: 0.8,   h: 0.36, stone: { seed: 3, w: 1.38, d: 1.3, dx: 0,      kind: 'plain',      tint: '#f4ebe0' } }, // front: smooth step
  { x: 0.9,   z: -0.8,  h: 1.1,  stone: { seed: 4, w: 1.3,  d: 1.1, dx: 0,      kind: 'sandstone',  tint: '#f1e2d6' } }, // back: block
  { x: 1.95,  z: 0.8,   h: 0.5,  stone: { seed: 5, w: 2.53, d: 1.4, dx: -0.115, kind: 'sandstone',  tint: '#fff0e4' } }  // front: rough slab
]

// Phones (portrait) are only ~2.8 world units wide, so the wide single-row banner layout would
// make the bottles tiny. Instead the six bottles zig-zag between a back row (tall blocks) and a
// front row (low blocks), 0.6 apart, like the banner's overlap, each on its own block.
const M_STEP = 0.6
const PLACES_M = [0, 1, 2, 3, 4, 5].map((i) => {
  const back = i % 2 === 0
  return {
    x: -1.5 + i * M_STEP,
    z: back ? -0.85 : 0.85,
    h: back ? 1.7 : 0.4,
    stone: { seed: i + 1, w: 0.95, d: 0.95, dx: 0, kind: ['travertine', 'plain', 'travertine', 'sandstone', 'plain', 'sandstone'][i], tint: ['#fbf1e8', '#f4ebe0', '#f6ece2', '#f1e2d6', '#f4ebe0', '#fff0e4'][i] }
  }
})

/** All bottles at once. Click -> open the detail view for that bottle. */
export default function Showcase() {
  const index = useStore((s) => s.index)
  const view = useStore((s) => s.view)
  const refs = useRef([])
  const mobile = useThree((s) => s.size.width < 820)
  const PLACES_NOW = mobile ? PLACES_M : PLACES
  const LEDGE_NOW = mobile ? LEDGE_M : LEDGE
  const ledge = useRef()
  const ledgeShadow = useRef()
  const rectMap = useMemo(getSoftRectTexture, [])
  const cursor = (on) => { document.body.style.cursor = on && useStore.getState().view === 'board' ? 'pointer' : '' }

  // Leaving the board (or unmounting) must clear the pointer cursor.
  useEffect(() => {
    if (view !== 'board') document.body.style.cursor = ''
    return () => { document.body.style.cursor = '' }
  }, [view])

  const props = useRef()

  useFrame((state) => {
    const lay = computeLayout(state.viewport, state.size)
    const d = anim.detail
    const b = lay.board
    const base = LEDGE_H * b.s
    const sp = PLACES_NOW[index]
    // everything that is not the chosen bottle slides off to the side (full size, no shrinking)
    const exit = smootherstep(d, 0, 0.9)
    const reach = state.viewport.width * 0.6 + 5
    const gone = d > 0.995

    // long stone ledge (+ its shadow and the little props on it): slides away to the right
    const lx = b.x + LEDGE_NOW.x * b.s + exit * (reach + 5)
    ledge.current.position.set(lx, LEDGE_H / 2 * b.s, LEDGE_NOW.z * b.s)
    ledge.current.scale.setScalar(b.s)
    ledge.current.visible = !gone
    ledgeShadow.current.visible = !gone
    ledgeShadow.current.position.set(lx, 0.003, LEDGE_NOW.z * b.s)
    ledgeShadow.current.scale.setScalar(b.s)
    props.current.visible = !gone
    props.current.position.set(b.x + exit * (reach + 5), base, 0)
    props.current.scale.setScalar(b.s)

    PLACES_NOW.forEach((p, i) => {
      const g = refs.current[i]
      if (!g) return
      let x = b.x + p.x * b.s
      let y = b.y + base
      let z = p.z * b.s
      let sc = b.s

      if (i === index) {
        // glide to the left half; shrink a little if a tall pedestal would not fit the frame
        const fit = Math.min(lay.detail.s, lay.detail.avail / (p.h + 3.1))
        x = lerp(x, lay.detail.x, d)
        y = lerp(y, lay.detail.y, d)
        z = lerp(z, 0, d)
        sc = lerp(sc, fit, d)
        // the camera looks at the bottle wherever it is right now
        anim.focus.x = x
        anim.focus.y = y + (p.h + 1.5) * sc
        anim.focus.z = z
      } else {
        x += (p.x < sp.x ? -1 : 1) * exit * reach
        g.visible = !gone
      }
      if (i === index) g.visible = true
      g.position.set(x, y, z)
      g.scale.setScalar(sc)
    })
  })

  return (
    <group>
      <mesh ref={ledgeShadow} rotation-x={-Math.PI / 2} renderOrder={1}>
        <planeGeometry args={[LEDGE_NOW.w + 2.4, LEDGE_NOW.d + 1.8]} />
        <meshBasicMaterial map={rectMap} color="#3a2410" transparent opacity={0.45} depthWrite={false} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <StoneBlock key={mobile ? 'm' : 'd'} ref={ledge} width={LEDGE_NOW.w} height={LEDGE_H} depth={LEDGE_NOW.d} tint="#ece2d6" seed={11} kind="travertine" />
      {WINES.map((w, i) => (
        <WineSlot
          key={w.id + (mobile ? '-m' : '')}
          ref={(el) => (refs.current[i] = el)}
          wine={w}
          place={PLACES_NOW[i]}
          selected={i === index}
          onOver={() => cursor(true)}
          onOut={() => cursor(false)}
          onSelect={() => useStore.getState().openDetail(i)}
        />
      ))}
      <group ref={props}>
        <Props mobile={mobile} />
      </group>
      <Fog />
    </group>
  )
}
