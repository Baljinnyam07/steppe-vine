import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import { WINES } from '../data/wines'
import { useStore } from '../store'
import { anim, computeLayout } from './anim'
import WineSlot from './WineSlot'
import { StoneBlock } from './Plinth'
import { getSoftRectTexture } from './textures'
import Fog from './Fog'

const { lerp } = MathUtils

// Stepped stone platform modelled on the banner. Everything stands on one thick base slab:
//   front row (z ~ 0.8): three wide blocks that butt against each other with a hairline seam
//     (pitted travertine slab | smooth plain step | rough sandstone slab)
//   back row (z ~ -0.75): taller blocks rising behind them.
// [x, z] is where the bottle stands, `h` the block height, `stone.dx` the block centre offset from
// the bottle. Blocks touch but never intersect: keep a >= 0.03 seam between neighbours.
//   front x-ranges: [-3.35, -0.87]  [-0.84, 0.54]  [0.57, 3.10]
const LEDGE_H = 0.24
const LEDGE = { w: 8.0, d: 3.6, x: -0.2, z: 0.1 }
const PLACES = [
  { x: -2.95, z: -0.75, h: 0.95, stone: { seed: 6, w: 1.1,  d: 1.1, dx: 0,      kind: 'travertine', tint: '#fbf1e8' } }, // back, left
  { x: -1.87, z: 0.8,   h: 0.42, stone: { seed: 1, w: 2.48, d: 1.4, dx: -0.24,  kind: 'travertine', tint: '#fff8f0' } }, // front: long pitted slab
  { x: -1.03, z: -0.75, h: 1.2,  stone: { seed: 2, w: 1.0,  d: 1.0, dx: 0,      kind: 'travertine', tint: '#f6ece2' } }, // back: tall cube
  { x: -0.15, z: 0.8,   h: 0.36, stone: { seed: 3, w: 1.38, d: 1.3, dx: 0,      kind: 'plain',      tint: '#f4ebe0' } }, // front: smooth step
  { x: 0.9,   z: -0.8,  h: 1.1,  stone: { seed: 4, w: 1.3,  d: 1.1, dx: 0,      kind: 'sandstone',  tint: '#f1e2d6' } }, // back: block
  { x: 1.95,  z: 0.8,   h: 0.5,  stone: { seed: 5, w: 2.53, d: 1.4, dx: -0.115, kind: 'sandstone',  tint: '#fff0e4' } }  // front: rough slab
]

/** All bottles at once. Click -> open the detail view for that bottle. */
export default function Showcase() {
  const index = useStore((s) => s.index)
  const view = useStore((s) => s.view)
  const refs = useRef([])
  const ledge = useRef()
  const ledgeShadow = useRef()
  const rectMap = useMemo(getSoftRectTexture, [])
  const cursor = (on) => { document.body.style.cursor = on && useStore.getState().view === 'board' ? 'pointer' : '' }

  // Leaving the board (or unmounting) must clear the pointer cursor.
  useEffect(() => {
    if (view !== 'board') document.body.style.cursor = ''
    return () => { document.body.style.cursor = '' }
  }, [view])

  useFrame((state) => {
    const lay = computeLayout(state.viewport, state.size)
    const d = anim.detail
    const b = lay.board
    const base = LEDGE_H * b.s

    // long stone ledge under everything; it sinks away for the detail view
    ledge.current.position.set(b.x + LEDGE.x * b.s, LEDGE_H / 2 * b.s - d * 3, LEDGE.z * b.s)
    ledge.current.scale.setScalar(b.s)
    ledge.current.visible = d < 0.99
    ledgeShadow.current.visible = d < 0.99
    ledgeShadow.current.position.set(b.x + LEDGE.x * b.s, 0.003, LEDGE.z * b.s)
    ledgeShadow.current.scale.setScalar(b.s)

    PLACES.forEach((p, i) => {
      const g = refs.current[i]
      if (!g) return
      const sel = i === index ? d : 0
      let x = b.x + p.x * b.s
      let y = b.y + base
      let z = p.z * b.s
      let sc = b.s

      if (i === index) {
        // where the camera should fly to when this bottle is clicked
        anim.focus.x = x
        anim.focus.y = y + (p.h + 1.5) * b.s
        anim.focus.z = z
        x = lerp(x, lay.detail.x, sel)
        y = lerp(y, lay.detail.y, sel)
        z = lerp(z, 0, sel)
        sc = lerp(sc, lay.detail.s, sel)
      } else {
        sc *= 1 - d
        x += Math.sign(p.x + 0.01) * d * 4
      }
      g.position.set(x, y, z)
      g.scale.setScalar(Math.max(sc, 0.0001))
      g.visible = sc > 0.01
    })
  })

  return (
    <group>
      <mesh ref={ledgeShadow} rotation-x={-Math.PI / 2} renderOrder={1}>
        <planeGeometry args={[LEDGE.w + 2.4, LEDGE.d + 1.8]} />
        <meshBasicMaterial map={rectMap} color="#3a2410" transparent opacity={0.45} depthWrite={false} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <StoneBlock ref={ledge} width={LEDGE.w} height={LEDGE_H} depth={LEDGE.d} tint="#ece2d6" seed={11} kind="travertine" />
      {WINES.map((w, i) => (
        <WineSlot
          key={w.id}
          ref={(el) => (refs.current[i] = el)}
          wine={w}
          place={PLACES[i]}
          selected={i === index}
          onOver={() => cursor(true)}
          onOut={() => cursor(false)}
          onSelect={() => useStore.getState().openDetail(i)}
        />
      ))}
      <Fog />
    </group>
  )
}
