import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { makeLabelTexture } from './textures'
import { CAUSTIC_LAYER, U as causticU } from './causticShare'

export const BOTTLE_H = 3.0

// Silhouettes (radius, height). All are 3.0 tall so the pour maths in WineSlot holds.
const SHAPES = {
  // Bordeaux: high square shoulders, long neck. Each profile has a rounded heel, a raised punt (the
  // dimple under the base, which refracts light nicely) and a lipped finish at the mouth.
  bordeaux: {
    r: 0.42, neck: 0.14,
    pts: [[0, 0.11], [0.1, 0.085], [0.24, 0.03], [0.32, 0.004], [0.385, 0.012], [0.415, 0.06], [0.421, 0.14], [0.42, 1.68], [0.414, 1.8], [0.39, 1.92], [0.33, 2.03], [0.25, 2.14], [0.185, 2.27], [0.152, 2.42], [0.141, 2.6], [0.141, 2.85], [0.15, 2.92], [0.163, 2.955], [0.165, 2.985], [0.15, 3.0], [0.124, 3.0]]
  },
  // Burgundy: sloping shoulders, slimmer, gentle neck
  burgundy: {
    r: 0.41, neck: 0.14,
    pts: [[0, 0.11], [0.1, 0.085], [0.23, 0.03], [0.31, 0.004], [0.375, 0.012], [0.405, 0.06], [0.411, 0.14], [0.41, 1.3], [0.4, 1.5], [0.365, 1.75], [0.3, 2.0], [0.225, 2.22], [0.172, 2.42], [0.148, 2.6], [0.141, 2.78], [0.142, 2.88], [0.153, 2.93], [0.164, 2.96], [0.165, 2.988], [0.15, 3.0], [0.124, 3.0]]
  },
  // Tall flute-style (Dolce)
  tall: {
    r: 0.36, neck: 0.125,
    pts: [[0, 0.1], [0.09, 0.078], [0.21, 0.028], [0.28, 0.004], [0.335, 0.012], [0.357, 0.06], [0.361, 0.14], [0.36, 1.5], [0.345, 1.72], [0.3, 1.95], [0.235, 2.15], [0.175, 2.35], [0.14, 2.52], [0.127, 2.7], [0.126, 2.88], [0.136, 2.94], [0.148, 2.96], [0.15, 2.988], [0.138, 3.0], [0.11, 3.0]]
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
  // (include the heel points: starting higher made the wine a long cone from the base up to the shoulder)
  const inner = s.pts.filter(([, y]) => y >= 0.06 && y < LIQUID_TOP).map(([r, y]) => [r * 0.925, Math.max(y, 0.1)])
  // the wine surface is flat: end the profile at the glass wall exactly at the fill level (jumping straight to the axis made a pointed cone on top)
  const k = s.pts.findIndex(([, y]) => y >= LIQUID_TOP)
  const [r0, y0] = s.pts[k - 1], [r1, y1] = s.pts[k]
  const rTop = (r0 + ((r1 - r0) * (LIQUID_TOP - y0)) / (y1 - y0)) * 0.925
  inner.push([rTop, LIQUID_TOP])
  const liquid = [[0, 0.12], ...inner, [0, LIQUID_TOP]]
  return (cache[name] = {
    ...s,
    liqR: inner[inner.length - 1][0],
    body: new THREE.LatheGeometry(smooth(s.pts), 96),
    foil: new THREE.LatheGeometry(foil.map(([x, y]) => new THREE.Vector2(x, y)), 48),
    liquid: new THREE.LatheGeometry(smooth(liquid, 3), 64)
  })
}

// Glass looks: dark "antique green" for most reds, clear flint for whites / dessert / pinot.
const GLASS = {
  dark: { tint: '#100c0d', tintOpacity: 0.93 },
  clear: { tint: '#dfe8dc', tintOpacity: 0.05 }
}

// The real label, cropped from the product photo (see labelImg / labelSize / labelY in data/wines.js).
function PhotoLabel({ wine, radius }) {
  const map = useTexture(wine.labelImg)
  useMemo(() => { map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8; map.needsUpdate = true }, [map])
  const [w, h] = wine.labelSize
  const arc = w / radius
  return (
    <mesh position={[0, wine.labelY, 0]} castShadow renderOrder={2}>
      <cylinderGeometry args={[radius, radius, h, 64, 1, true, -arc / 2, arc]} />
      <meshStandardMaterial map={map} roughness={0.6} metalness={0.15} transparent alphaTest={0.04} side={THREE.FrontSide} />
    </mesh>
  )
}


// Glass casts a thin, see-through shadow instead of a solid black one: this proxy is drawn only into the
// shadow map, with a dithered discard that the soft (VSM) shadow blurs into partial, lighter darkness.
function makeGlassShadowMaterial(keep) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uKeep = { value: keep }
    sh.fragmentShader = `uniform float uKeep;
${sh.fragmentShader}`.replace(
      'void main() {',
      `void main() {
        if (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) > uKeep) discard;`
    )
  }
  return m
}

// Glass edge: thin bright outline where the surface turns away from the viewer (Fresnel). It is what
// makes an otherwise see-through bottle read as glass with a thick wall, especially in front of gold wine.
const rimVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`
const rimFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPow, uStrength;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPow);
    gl_FragColor = vec4(uColor * f * uStrength, 1.0);
  }
`
function GlassRim({ geometry, color = '#fff6e4', strength = 0.9, power = 2.4 }) {
  const uniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(color) }, uPow: { value: power }, uStrength: { value: strength } }),
    [color, power, strength]
  )
  return (
    <mesh geometry={geometry} renderOrder={2}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={rimVert}
        fragmentShader={rimFrag}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

// Invisible copy of the glass that only the sun's caustic pass sees (layer CAUSTIC_LAYER): it turns into
// wine-coloured light with a bright core and bright edges, moving like water light. See causticShare.js.
const cVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vW;
  varying float vY;
  void main() {
    vN = normalize(normalMatrix * normal);
    vY = position.y;
    vW = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const cFrag = /* glsl */ `
  uniform vec3 uCol;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vW;
  varying float vY;
  void main() {
    if (vY > 2.05) discard; // only the body focuses light: the thin neck made a long hard blade on the floor
    vec3 n = normalize(vN);
    float core = pow(max(n.z, 0.0), 2.4);
    float edge = pow(1.0 - max(n.z, 0.0), 3.0);
    vec2 p = vW.xz * 3.2 + vW.y * 1.6;
    float rip = 0.5 + 0.5 * sin(p.x * 3.0 + uTime * 0.9) * sin(p.y * 3.0 - uTime * 0.7);
    float i = (core * 0.95 + edge * 0.7) * (0.6 + 0.6 * rip);
    gl_FragColor = vec4(uCol * i, gl_FragCoord.z);
  }
`
function CausticProxy({ wine, geometry }) {
  const ref = useRef()
  const uniforms = useMemo(() => {
    const c = new THREE.Color(wine.wine)
    const lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11
    // dark reds let little light through and throw a ruby patch; whites / dessert wines a golden one
    const col = lum < 0.3 ? new THREE.Color('#ff3d2e').multiplyScalar(0.5) : new THREE.Color(wine.wine).lerp(new THREE.Color('#ffd27a'), 0.5).multiplyScalar(1.0)
    return { uCol: { value: col }, uTime: causticU.time }
  }, [wine.wine])
  useEffect(() => { ref.current?.layers.set(CAUSTIC_LAYER) }, [])
  return (
    <mesh ref={ref} geometry={geometry}>
      <shaderMaterial uniforms={uniforms} vertexShader={cVert} fragmentShader={cFrag} blending={THREE.NoBlending} transparent={false} />
    </mesh>
  )
}

/**
 * Real-glass bottle: a transmissive (see-through, refracting) glass shell around an actual volume of
 * wine. Through dark glass the full body reads almost black-red while the empty neck stays a lighter
 * green; clear glass shows the wine's colour. Reflections come from the scene environment (softbox
 * strips in Scene.jsx), which is assigned explicitly so `envMapIntensity` applies.
 */
function ProceduralBottle({ wine }) {
  const g = useMemo(() => shapeGeometry(wine.shape ?? 'bordeaux'), [wine.shape])
  const [label, setLabel] = useState(() => makeLabelTexture(wine))
  const glassMat = useRef()
  const liquidMat = useRef()
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
    for (const m of [glassMat.current, foilMat.current, liquidMat.current]) {
      if (m && env && m.envMap !== env) { m.envMap = env; m.needsUpdate = true }
    }
  })

  const clear = wine.glassOpacity < 1
  const look = clear ? GLASS.clear : GLASS.dark
  // red wine in a bottle reads as a deep, almost black ruby; whites / dessert wines keep their glow
  const liquid = useMemo(() => {
    const c = new THREE.Color(wine.wine)
    const lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11
    // reds absorb hard (deep ruby, near black in the middle, lighter at the edges); whites / dessert wines stay bright
    const hsl = {}
    c.getHSL(hsl)
    // reds: a bright ruby absorber (deep but never black); whites / dessert wines: saturated gold
    return lum < 0.3
      ? { absorb: new THREE.Color().setHSL(hsl.h, 0.95, 0.17), dist: 0.07 }
      : { absorb: new THREE.Color().setHSL(hsl.h, 0.9, 0.55), dist: 1.5 }
  }, [wine.wine])
  const shadowMat = useMemo(() => makeGlassShadowMaterial(clear ? 0.26 : 0.66), [clear])
  const labelR = g.r + 0.006
  const arc = 0.95 / labelR // ~0.95 units of label width

  return (
    <group>
      {/* the wine: a real volume of liquid. It refracts whatever is behind the bottle and absorbs light
          with the wine's own colour, so it looks deep ruby / gold and shows the wall bent through it. */}
      <mesh geometry={g.liquid}>
        <meshPhysicalMaterial
          ref={liquidMat}
          color="#ffffff"
          transmission={1}
          ior={1.34}
          thickness={0.75}
          roughness={0.02}
          attenuationColor={liquid.absorb}
          attenuationDistance={liquid.dist}
          specularIntensity={1}
          clearcoat={0.5}
          clearcoatRoughness={0.03}
          envMapIntensity={0.55}
        />
      </mesh>
      {/* shadow-only proxy of the glass (see makeGlassShadowMaterial) */}
      <mesh geometry={g.body} castShadow customDepthMaterial={shadowMat} renderOrder={-1}>
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
      {/* the glass, in two thin layers: a faint tint (green for the dark bottles) ... */}
      <mesh geometry={g.body} renderOrder={1}>
        <meshPhysicalMaterial color={look.tint} transparent opacity={look.tintOpacity} roughness={0.1} depthWrite={false} />
      </mesh>
      {/* ... and its reflections only (black + additive: sky, sun and window highlights on the surface) */}
      <mesh geometry={g.body} renderOrder={1}>
        <meshPhysicalMaterial
          ref={glassMat}
          color="#000000"
          roughness={0.02}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.02}
          specularIntensity={1}
          envMapIntensity={0.4}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <CausticProxy wine={wine} geometry={g.body} />
      <GlassRim geometry={g.body} strength={clear ? 0.2 : 0.14} />
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
      {wine.labelImg ? <PhotoLabel wine={wine} radius={labelR} /> : (
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
      )}
    </group>
  )
}

/**
 * A bottle loaded from a .glb (see `model` in data/wines.js). The file is measured, scaled to the same
 * 3-unit height as the procedural bottles, stood on the pedestal (origin at its base, centred) and
 * turned so its label faces the camera. Its glass gets the scene reflections like the procedural glass.
 */
const MODEL_LABEL_FACES = -Math.PI / 2 // in this file the label is on +x; rotate it to +z (towards the camera)

function GltfBottle({ url }) {
  const { scene } = useGLTF(url)
  const { obj, scale, offset } = useMemo(() => {
    const obj = scene.clone(true)
    obj.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(obj)
    const size = box.getSize(new THREE.Vector3())
    const c = box.getCenter(new THREE.Vector3())
    obj.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true }
    })
    return { obj, scale: BOTTLE_H / size.y, offset: [-c.x, -box.min.y, -c.z] }
  }, [scene])

  // hand the scene environment to every material so the glass reflects the softboxes
  useFrame(({ scene: s }) => {
    const env = s.environment
    if (!env) return
    obj.traverse((o) => {
      const m = o.isMesh && o.material
      if (m && m.envMap !== env) {
        m.envMap = env
        m.envMapIntensity = m.transmission > 0 ? 2.4 : 1.2
        m.needsUpdate = true
      }
    })
  })

  return (
    <group scale={scale} rotation-y={MODEL_LABEL_FACES}>
      <primitive object={obj} position={offset} />
    </group>
  )
}

export default function Bottle({ wine }) {
  if (!wine.model) return <ProceduralBottle wine={wine} />
  return (
    <>
      <GltfBottle url={wine.model} />
      <CausticProxy wine={wine} geometry={shapeGeometry('bordeaux').body} />
    </>
  )
}

useGLTF.preload('/bottle/Wine%20bottle.glb')
