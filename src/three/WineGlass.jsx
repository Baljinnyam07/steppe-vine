import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { anim } from './anim'

const v = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y))

const GLASS = v([
  [0, 0], [0.36, 0], [0.37, 0.02], [0.06, 0.07], [0.03, 0.14], [0.03, 0.6],
  [0.1, 0.66], [0.3, 0.8], [0.42, 1.05], [0.4, 1.3], [0.33, 1.55], [0.3, 1.6]
])
// Liquid volume; its origin is the bowl's lowest point so a uniform scale "fills" it.
const LIQUID = v([
  [0, 0], [0.09, 0.02], [0.24, 0.1], [0.34, 0.28], [0.385, 0.45], [0.375, 0.6], [0, 0.6]
])
export const GLASS_X = 2.4
export const POUR_TIP_Y = 1.96 // relative to the block top
export const LIQUID_BASE_Y = 0.72

export default function WineGlass({ wine, active }) {
  const root = useRef()
  const liquid = useRef()
  const stream = useRef()
  const glassGeo = useMemo(() => new THREE.LatheGeometry(GLASS, 48), [])
  const liquidGeo = useMemo(() => new THREE.LatheGeometry(LIQUID, 40), [])

  useFrame((state) => {
    const g = active ? anim.glass : 0
    root.current.visible = g > 0.001
    // slides in from the right and scales up
    root.current.position.x = GLASS_X + (1 - g) * 1.4
    root.current.scale.setScalar(Math.max(g, 0.0001))

    const f = Math.max(anim.fill, 0.0001)
    liquid.current.visible = anim.fill > 0.005
    liquid.current.scale.setScalar(f)

    // thin stream from the bottle lip down to the liquid surface
    const top = LIQUID_BASE_Y + f * 0.6
    const len = Math.max(POUR_TIP_Y - top, 0.01) * (anim.stream > 0.001 ? 1 : 0)
    const s = anim.stream
    stream.current.visible = s > 0.001
    const wobble = 1 + Math.sin(state.clock.elapsedTime * 40) * 0.12
    stream.current.scale.set(wobble * s, len * s, wobble * s)
    stream.current.position.y = POUR_TIP_Y - (len * s) / 2 - (1 - s) * 0
  })

  return (
    <>
      <group ref={root} position={[GLASS_X, 0, 0.15]}>
        <mesh geometry={glassGeo} castShadow>
          <meshPhysicalMaterial
            color="#ffffff"
            transparent
            opacity={0.3}
            roughness={0}
            metalness={0}
            clearcoat={1}
            envMapIntensity={6}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={liquid} geometry={liquidGeo} position={[0, LIQUID_BASE_Y, 0]}>
          <meshPhysicalMaterial color={wine.wine} roughness={0.08} clearcoat={1} emissive={wine.wine} emissiveIntensity={0.25} />
        </mesh>
      </group>
      {/* the stream lives in slot space (not scaled with the glass) */}
      <mesh ref={stream} position={[GLASS_X, POUR_TIP_Y, 0.15]} visible={false}>
        <cylinderGeometry args={[0.028, 0.02, 1, 12]} />
        <meshStandardMaterial color={wine.wine} emissive={wine.wine} emissiveIntensity={0.4} roughness={0.1} transparent opacity={0.92} />
      </mesh>
    </>
  )
}
