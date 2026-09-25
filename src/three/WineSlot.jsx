import { forwardRef, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { StoneBlock } from './Plinth'
import Bottle from './Bottle'
import { anim } from './anim'
import { useStore } from '../store'
import { getBlobTexture, getSoftRectTexture } from './textures'


/**
 * One pedestal + bottle. In the detail view the selected slot glides to the left half and its
 * pedestal stays as it is; the bottle just stands there (no glass, no pouring).
 *
 * To use a GLTF instead of the procedural bottle, replace <Bottle/> with a component that
 * does `const { scene } = useGLTF('/bottle.glb')` and returns <primitive object={scene.clone()}/>
 * (origin at the base, ~3 units tall).
 */
const WineSlot = forwardRef(function WineSlot({ wine, place, selected, onOver, onOut, onSelect }, ref) {
  const { h, stone } = place
  const stoneRef = useRef()
  const content = useRef()
  const groundShadow = useRef()
  const contact = useRef()
  const spin = useRef()
  const rot = useRef({ y: 0, vel: 0, drag: false, x: 0 })
  const blobMap = useMemo(getBlobTexture, [])
  // the dark contact patch under the bottle must stay on the stone's top face (it used to overhang its back / side edges)
  const blobSize = Math.max(0.5, Math.min(1.25, stone.w - 2 * Math.abs(stone.dx) - 0.12, stone.d - 0.16))

  // detail view: drag sideways to turn the bottle around (with a little momentum)
  useEffect(() => {
    if (!selected) return
    const r = rot.current
    const ready = () => useStore.getState().view === 'detail' && anim.detail > 0.9
    const down = (e) => {
      if (!ready() || e.target.tagName !== 'CANVAS') return
      r.drag = true; r.x = e.clientX; r.vel = 0
      document.body.style.cursor = 'grabbing'
    }
    const move = (e) => {
      if (!r.drag) return
      const dx = e.clientX - r.x
      r.x = e.clientX
      r.y += dx * 0.012
      r.vel = dx * 0.012
    }
    const up = () => { r.drag = false; if (ready()) document.body.style.cursor = 'grab' }
    const hover = (e) => {
      if (r.drag) return
      document.body.style.cursor = ready() && e.target.tagName === 'CANVAS' ? 'grab' : ''
    }
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointermove', hover)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointermove', hover)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      r.drag = false
      document.body.style.cursor = ''
    }
  }, [selected])
  const rectMap = useMemo(getSoftRectTexture, [])

  useFrame((_, dt) => {
    const r = rot.current
    if (!r.drag) {
      r.y += r.vel; r.vel *= Math.pow(0.02, dt)
      // when the bottle is put back on the shelf it turns to face front again
      if (!selected || anim.detail < 0.5) {
        const TAU = Math.PI * 2
        const target = Math.round(r.y / TAU) * TAU
        r.y += (target - r.y) * Math.min(1, dt * 4)
        r.vel = 0
      }
    }
    spin.current.rotation.y = r.y

    // the pedestal keeps its size; only its offset under the bottle eases to centre in the detail view
    const d = selected ? anim.detail : 0
    stoneRef.current.position.x = stone.dx * (1 - d)
    groundShadow.current.position.x = stone.dx * (1 - d)
    contact.current.material.opacity = 0.5
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
      <group ref={content} position={[0, h, 0]}>
        <mesh ref={contact} rotation-x={-Math.PI / 2} position={[0, 0.006, -0.05]} renderOrder={2}>
          <planeGeometry args={[blobSize, blobSize]} />
          <meshBasicMaterial map={blobMap} color="#2a1608" transparent opacity={0.5} depthWrite={false} polygonOffset polygonOffsetFactor={-3} />
        </mesh>
        <group position={[0, 0, -0.05]}>
          <group ref={spin}>
            <Bottle wine={wine} />
          </group>
        </group>
      </group>
    </group>
  )
})

export default WineSlot
