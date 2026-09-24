import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeLabelTexture } from './textures'

export const BOTTLE_H = 3.0

// Silhouettes (radius, height). All are 3.0 tall so the pour maths in WineSlot holds.
const SHAPES = {
  bordeaux: {
    r: 0.42, neck: 0.14,
    pts: [[0, 0], [0.33, 0], [0.4, 0.05], [0.42, 0.12], [0.42, 1.7], [0.4, 1.86], [0.32, 2.02], [0.2, 2.2], [0.15, 2.4], [0.14, 2.6], [0.145, 2.9], [0.16, 2.95], [0.13, 2.98]]
  },
  burgundy: {
    r: 0.41, neck: 0.14,
    pts: [[0, 0], [0.32, 0], [0.39, 0.05], [0.41, 0.14], [0.41, 1.35], [0.38, 1.7], [0.3, 2.0], [0.2, 2.3], [0.15, 2.55], [0.14, 2.7], [0.145, 2.9], [0.16, 2.95], [0.13, 2.98]]
  },
  tall: {
    r: 0.36, neck: 0.125,
    pts: [[0, 0], [0.28, 0], [0.35, 0.06], [0.36, 0.14], [0.36, 1.5], [0.33, 1.8], [0.24, 2.1], [0.16, 2.4], [0.13, 2.55], [0.125, 2.9], [0.15, 2.95], [0.12, 2.98]]
  }
}

const LIQUID_TOP = 2.35 // fill level (bottom of the neck)

// Smooth the hand-picked profile with Chaikin corner cutting: rounds the shoulders but, unlike a
// Catmull-Rom spline, never bulges past the original outline (a spline pushed the wine outside the
// glass and the glass outside the label). End points are kept.
function smooth(pts, iterations = 4) {
  let p = pts
  for (let k = 0; k < iterations; k++) {
    const out = [p[0]]
    for (let i = 0; i < p.length - 1; i++) {
      const [x0, y0] = p[i], [x1, y1] = p[i + 1]
      out.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25], [x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75])
    }
    out.push(p[p.length - 1])
    p = out
  }
  return p.map(([x, y]) => new THREE.Vector2(x, y))
}

const cache = {}
function shapeGeometry(name) {
  if (cache[name]) return cache[name]
  const s = SHAPES[name]
  const n = s.neck
  // capsule, open on top so the wine can pour out
  const foil = [[n + 0.012, 2.5], [n + 0.015, 2.55], [n + 0.015, 2.93], [n + 0.032, 2.96], [n + 0.032, 3.0], [n - 0.004, 3.0]]
  // wine inside: the body profile shrunk by the glass wall, filled up to the neck
  const inner = s.pts.filter(([, y]) => y >= 0.12 && y <= LIQUID_TOP).map(([r, y]) => [r * 0.93, y])
  const liquid = [[0, 0.1], ...inner, [0, LIQUID_TOP]]
  return (cache[name] = {
    ...s,
    body: new THREE.LatheGeometry(smooth(s.pts), 96),
    foil: new THREE.LatheGeometry(foil.map(([x, y]) => new THREE.Vector2(x, y)), 48),
    liquid: new THREE.LatheGeometry(smooth(liquid, 3), 64)
  })
}

// Glass looks: dark "antique green" for most reds, clear flint for whites / dessert / pinot.
const GLASS = {
  dark: { color: '#8fa88c', attenuationColor: '#17351f', attenuationDistance: 0.18 },
  clear: { color: '#ffffff', attenuationColor: '#f3efe0', attenuationDistance: 4 }
}

/**
 * Real-glass bottle: a transmissive (see-through, refracting) glass shell around an actual volume of
 * wine. Through dark glass the full body reads almost black-red while the empty neck stays a lighter
 * green; clear glass shows the wine's colour. Reflections come from the scene environment (softbox
 * strips in Scene.jsx), which is assigned explicitly so `envMapIntensity` applies.
 */
export default function Bottle({ wine }) {
  const g = useMemo(() => shapeGeometry(wine.shape ?? 'bordeaux'), [wine.shape])
  const [label, setLabel] = useState(() => makeLabelTexture(wine))
  const glassMat = useRef()
  const foilMat = useRef()

  // Redraw the label once web fonts have loaded so Cyrillic/Latin use Playfair.
  useEffect(() => {
    let live = true
    document.fonts?.ready.then(() => live && setLabel(makeLabelTexture(wine)))
    return () => { live = false }
  }, [wine])

  // Scene.environment is set asynchronously by <Environment/>; hand it to the glass once it exists.
  useFrame(({ scene }) => {
    const env = scene.environment
    for (const m of [glassMat.current, foilMat.current]) {
      if (m && env && m.envMap !== env) { m.envMap = env; m.needsUpdate = true }
    }
  })

  const clear = wine.glassOpacity < 1
  const look = clear ? GLASS.clear : GLASS.dark
  // red wine in a bottle reads as a deep, almost black ruby; whites / dessert wines keep their glow
  const liquid = useMemo(() => {
    const c = new THREE.Color(wine.wine)
    const lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11
    return lum < 0.3
      ? { color: c.clone().multiplyScalar(0.35), glow: 0.02 }
      : { color: c, glow: 0.35 }
  }, [wine.wine])
  const labelR = g.r + 0.006
  const arc = 0.95 / labelR // ~0.95 units of label width

  return (
    <group>
      {/* the wine */}
      <mesh geometry={g.liquid}>
        <meshPhysicalMaterial
          color={liquid.color}
          roughness={0.12}
          emissive={liquid.color}
          emissiveIntensity={liquid.glow}
        />
      </mesh>
      {/* the glass */}
      <mesh geometry={g.body} castShadow receiveShadow>
        <meshPhysicalMaterial
          ref={glassMat}
          color={look.color}
          transmission={1}
          thickness={0.25}
          ior={1.52}
          roughness={0.03}
          metalness={0}
          attenuationColor={look.attenuationColor}
          attenuationDistance={look.attenuationDistance}
          specularIntensity={1}
          clearcoat={1}
          clearcoatRoughness={0.02}
          envMapIntensity={2.4}
        />
      </mesh>
      <mesh geometry={g.foil} castShadow>
        <meshPhysicalMaterial
          ref={foilMat}
          color={wine.foil}
          roughness={0.42}
          metalness={0.35}
          clearcoat={0.4}
          clearcoatRoughness={0.3}
          envMapIntensity={1.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* paper label wraps around the front (+z). Marked transparent so three.js draws it after the
          transmissive glass (otherwise the glass pass paints over it). */}
      <mesh position={[0, 0.95, 0]} castShadow renderOrder={2}>
        <cylinderGeometry args={[labelR, labelR, 0.85, 64, 1, true, -arc / 2, arc]} />
        <meshStandardMaterial
          map={label}
          roughness={0.85}
          transparent
          depthWrite
          alphaTest={wine.labelBg ? 0 : 0.05}
          side={THREE.FrontSide}
        />
      </mesh>
    </group>
  )
}
