import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store'
import { anim, playDetail } from './anim'
import { getWallTexture, getGrainBump } from './textures'
import Showcase from './Showcase'

const { damp, lerp } = THREE.MathUtils
const WIDE = { pos: new THREE.Vector3(0, 2.0, 11.6), look: new THREE.Vector3(0, 1.85, 0) }
const DETAIL_Z = 9.4

/**
 * Tan plaster wall with dappled leaf shadows. The picture is used as the emissive colour so the hue
 * stays exactly right, while the scene lights + a grain bump map give it real plaster shading.
 */
function Wall() {
  const map = useMemo(getWallTexture, [])
  const bump = useMemo(() => {
    const t = getGrainBump().clone()
    t.repeat.set(9, 5)
    t.needsUpdate = true
    return t
  }, [])
  return (
    <mesh position={[0, 3.6, -5]} receiveShadow>
      <planeGeometry args={[18, 10.2]} />
      <meshStandardMaterial map={map} emissiveMap={map} emissive="#ffffff" emissiveIntensity={0.6} bumpMap={bump} bumpScale={1.6} roughness={1} metalness={0} color="#b4aca0" />
    </mesh>
  )
}

/**
 * Honed limestone floor: the same CC0 photo stone as the smooth pedestal (public/textures/plain_*),
 * tinted lighter. It fades into the wall's lower edge, which the wall texture already blends to.
 */
function Floor() {
  const [map, normalMap, roughnessMap] = useTexture(
    ['/textures/plain_color.jpg', '/textures/plain_normal.jpg', '/textures/plain_rough.jpg'],
    (ts) => ts.forEach((t, i) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(10, 5) // ~6 world units per repeat
      t.anisotropy = 8
      if (i === 0) t.colorSpace = THREE.SRGBColorSpace
    })
  )
  const normalScale = useMemo(() => new THREE.Vector2(0.6, 0.6), [])
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[60, 30]} />
      <meshStandardMaterial map={map} normalMap={normalMap} normalScale={normalScale} roughnessMap={roughnessMap} color="#f0e2cf" roughness={1} metalness={0} />
    </mesh>
  )
}

/**
 * Camera: gentle mouse parallax on the wide shot. `anim.zoom` (GSAP) flies it in on the
 * clicked bottle (anim.focus), and `anim.detail` pulls it slightly closer for the split view.
 */
function CameraRig() {
  const base = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  const goal = useMemo(() => new THREE.Vector3(), [])
  useFrame((state, dt) => {
    const { camera, pointer } = state
    base.x = damp(base.x, pointer.x * 0.35, 4, dt)
    base.y = damp(base.y, WIDE.pos.y + pointer.y * 0.2, 4, dt)
    base.z = lerp(WIDE.pos.z, DETAIL_Z, anim.detail)

    const f = anim.focus
    const z = anim.zoom
    goal.set(f.x, f.y + 0.2, f.z + 5.2) // close-up position in front of the bottle
    camera.position.set(lerp(base.x, goal.x, z), lerp(base.y, goal.y, z), lerp(base.z, goal.z, z))
    look.set(lerp(WIDE.look.x, f.x, z), lerp(WIDE.look.y, f.y, z), lerp(WIDE.look.z, f.z, z))
    camera.lookAt(look)
  })
  return null
}

export default function Scene() {
  const view = useStore((s) => s.view)
  const first = useRef(true)

  // State machine -> GSAP timeline (showcase <-> detail)
  useEffect(() => {
    if (first.current) { first.current = false; if (view === 'board') return }
    playDetail(view === 'detail')
  }, [view])

  return (
    <>
      <color attach="background" args={['#c4a17c']} />
      <hemisphereLight args={['#fff1dc', '#b89670', 0.32]} />
      <ambientLight intensity={0.05} color="#ffe9cc" />
      {/* low afternoon sun from the upper left: long soft shadows to the right */}
      <directionalLight
        position={[-8, 7.5, 6]}
        intensity={3.8}
        color="#ffe3bf"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-4}
        shadow-camera-near={1}
        shadow-camera-far={35}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
        shadow-radius={6}
        shadow-blurSamples={24}
      />
      {/* gentle warm spot from above; kept well below the sun so it doesn't wash out the cast shadows */}
      <spotLight position={[1.5, 10, 5]} target-position={[1.5, 1, 0]} angle={0.75} penumbra={1} intensity={12} decay={1.4} color="#ffd9a6" />

      {/* Procedural env (no network): warm window-like strips for glass reflections. Kept low as ambient
          light so the sun's cast shadows stay visible; the bottle glass boosts it back via envMapIntensity. */}
      <Environment resolution={256} frames={1} environmentIntensity={0.28}>
        <Lightformer form="rect" intensity={4} color="#fff0d8" position={[-5, 4, 5]} scale={[6, 4, 1]} rotation-y={0.6} />
        <Lightformer form="rect" intensity={2} color="#ffd9a8" position={[6, 3, 3]} scale={[2, 6, 1]} rotation-y={-1.2} />
        <Lightformer form="rect" intensity={1.5} color="#ffffff" position={[0, 8, 0]} scale={[8, 8, 1]} rotation-x={Math.PI / 2} />
        {/* tall softbox strips: the long vertical highlights you see on bottles in product photos */}
        <Lightformer form="rect" intensity={14} color="#fff6ea" position={[-4, 2.6, 5]} scale={[0.9, 7, 1]} target={[0, 2, 0]} />
        <Lightformer form="rect" intensity={6} color="#ffe8cc" position={[4.5, 2.6, 4]} scale={[0.5, 6, 1]} target={[0, 2, 0]} />
      </Environment>

      <Wall />

      <Suspense fallback={null}>
        <Floor />
        <Showcase />
      </Suspense>
      <CameraRig />
    </>
  )
}
