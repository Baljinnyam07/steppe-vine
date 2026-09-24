import { forwardRef, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import { StoneBlock } from './Plinth'
import Bottle from './Bottle'
import WineGlass, { GLASS_X } from './WineGlass'
import { anim } from './anim'
import { getBlobTexture, getSoftRectTexture } from './textures'

const { lerp } = MathUtils
const PIVOT_Y = 1.5 // bottle centre above the pedestal top when standing
const DETAIL_H = 0.55 // pedestal height of the selected bottle in the detail view

// The pivot at the bottle's centre makes the pour a simple rotation.
// Final pour pose puts the lip exactly above the glass (see WineGlass GLASS_X / POUR_TIP_Y).
const POUR_ANGLE = -2.0
const POUR_DX = 1.04
const LIFT = 1.3
const TILT_DROP = 0.22

/**
 * One pedestal + bottle (+ glass in the detail view).
 *
 * To use a GLTF instead of the procedural bottle, replace <Bottle/> with a component that
 * does `const { scene } = useGLTF('/bottle.glb')` and returns <primitive object={scene.clone()}/>
 * (origin at the base, ~3 units tall so the pour maths still lines up).
 */
const WineSlot = forwardRef(function WineSlot({ wine, place, selected, onOver, onOut, onSelect }, ref) {
  const { h, stone } = place
  const stoneRef = useRef()
  const slab = useRef()
  const content = useRef()
  const pivot = useRef()
  const groundShadow = useRef()
  const contact = useRef()
  const blobMap = useMemo(getBlobTexture, [])
  const rectMap = useMemo(getSoftRectTexture, [])

  useFrame(() => {
    const d = selected ? anim.detail : 0
    const eff = lerp(h, DETAIL_H, d)

    // pedestal shrinks/narrows while the selected bottle moves into the detail layout
    stoneRef.current.scale.set(lerp(1, 1.6 / stone.w, d), eff / h, lerp(1, 1.5 / stone.d, d))
    stoneRef.current.position.set(stone.dx * (1 - d), eff / 2, 0)
    content.current.position.y = eff

    // soft shadow the block leaves on whatever it stands on, follows the pedestal's scale
    groundShadow.current.scale.set(stoneRef.current.scale.x, 1, stoneRef.current.scale.z)
    groundShadow.current.position.x = stone.dx * (1 - d)
    // dark patch under the bottle; fades while the bottle is lifted off for the pour
    contact.current.material.opacity = 0.5 * (1 - (selected ? anim.lift : 0))

    const g = selected ? anim.glass : 0
    slab.current.visible = g > 0.001
    slab.current.scale.set(Math.max(g, 0.0001), eff / h, Math.max(g, 0.0001))
    slab.current.position.y = eff / 2

    // pour pose in the detail view
    if (!selected) {
      pivot.current.position.set(0, PIVOT_Y, -0.05)
      pivot.current.rotation.z = 0
      return
    }
    pivot.current.position.set(
      POUR_DX * anim.tilt,
      PIVOT_Y + LIFT * anim.lift - TILT_DROP * anim.tilt,
      -0.05
    )
    pivot.current.rotation.z = POUR_ANGLE * anim.tilt
  })

  return (
    <group
      ref={ref}
      onPointerOver={(e) => { e.stopPropagation(); onOver() }}
      onPointerOut={(e) => { e.stopPropagation(); onOut() }}
      onClick={(e) => { if (e.delta < 6) { e.stopPropagation(); onSelect() } }}
    >
      <mesh ref={groundShadow} rotation-x={-Math.PI / 2} position={[stone.dx, 0.004, 0]} renderOrder={1}>
        <planeGeometry args={[stone.w + 0.9, stone.d + 0.9]} />
        <meshBasicMaterial map={rectMap} color="#3a2410" transparent opacity={0.5} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      <StoneBlock ref={stoneRef} width={stone.w} height={h} depth={stone.d} tint={stone.tint} seed={stone.seed} kind={stone.kind} position={[stone.dx, h / 2, 0]} />
      <StoneBlock ref={slab} width={1.2} height={h} depth={1.2} tint={stone.tint} seed={stone.seed + 3} kind={stone.kind} position={[GLASS_X, h / 2, 0.15]} visible={false} />
      <group ref={content} position={[0, h, 0]}>
        <mesh ref={contact} rotation-x={-Math.PI / 2} position={[0, 0.006, -0.05]} renderOrder={2}>
          <planeGeometry args={[1.25, 1.25]} />
          <meshBasicMaterial map={blobMap} color="#2a1608" transparent opacity={0.5} depthWrite={false} polygonOffset polygonOffsetFactor={-3} />
        </mesh>
        <group ref={pivot} position={[0, PIVOT_Y, -0.05]}>
          <group position={[0, -1.5, 0]}>
            <Bottle wine={wine} />
          </group>
        </group>
        <WineGlass wine={wine} active={selected} />
      </group>
    </group>
  )
})

export default WineSlot
