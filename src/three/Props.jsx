import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

// Small still-life props scattered on the stone ledge next to the bottles: grape bunches, loose berries,
// vine leaves, tendrils, a twig and corks. All procedural. Local origin = top surface of the ledge.

const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
const smooth = (x) => x * x * (3 - 2 * x)

// Grape skin: glossy, with the dusty "bloom" (frosted rim) that real grapes have.
const berryMaterial = (color) => (
  <meshPhysicalMaterial
    color={color}
    roughness={0.32}
    clearcoat={0.85}
    clearcoatRoughness={0.18}
    sheen={1}
    sheenRoughness={0.45}
    sheenColor="#d9cfe8"
    envMapIntensity={1.1}
  />
)

/**
 * A bunch lying on its side along +x: a teardrop cluster (wide shoulders at the stalk, tapering to the tip)
 * of ~60 berries that differ in size, shape and shade, on a woody stalk with a small curl.
 */
function GrapeBunch({ seed = 1, color = '#3d1a4a', scale = 1, ...props }) {
  const mesh = useRef()
  const { berries, stalk, tip } = useMemo(() => {
    const r = rng(seed * 97 + 3)
    const L = 0.62
    const out = []
    const rings = 11
    for (let k = 0; k < rings; k++) {
      const t = k / (rings - 1)
      const env = 0.16 * (0.28 + 0.72 * Math.sin(Math.min(1, t / 0.34) * Math.PI / 2)) * Math.pow(1 - t * 0.97, 0.85)
      const rad = 0.06 * (1 - t * 0.32)
      const n = Math.max(1, Math.round((2 * Math.PI * env) / (rad * 1.85)))
      for (let j = 0; j < n; j++) {
        const a = (j / n) * Math.PI * 2 + r() * 0.7 + k * 0.6
        const rr = env * (0.82 + r() * 0.25)
        const size = rad * (0.88 + r() * 0.26)
        const x = t * L + (r() - 0.5) * 0.03
        const y = Math.max(size * 0.92, 0.075 + Math.sin(a) * rr * 0.85)
        const z = Math.cos(a) * rr
        out.push({ p: [x, y, z], s: size, e: [1 + (r() - 0.5) * 0.14, 0.92 + r() * 0.1, 1 + (r() - 0.5) * 0.14], c: new THREE.Color(color).offsetHSL((r() - 0.5) * 0.03, (r() - 0.5) * 0.08, (r() - 0.5) * 0.07) })
      }
    }
    // the tip berry
    out.push({ p: [L + 0.04, 0.05, 0], s: 0.036, e: [1, 1, 1], c: new THREE.Color(color) })
    const stalk = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.28, 0.06, -0.04), new THREE.Vector3(-0.17, 0.085, 0.02), new THREE.Vector3(-0.05, 0.1, 0.0), new THREE.Vector3(0.06, 0.1, 0)
    ])
    return { berries: out, stalk, tip: L }
  }, [seed, color])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), rot = new THREE.Euler()
    const r = rng(seed * 13 + 1)
    berries.forEach((b, i) => {
      rot.set(r() * 3, r() * 3, r() * 3)
      m.compose(new THREE.Vector3(...b.p), q.setFromEuler(rot), new THREE.Vector3(b.e[0] * b.s, b.e[1] * b.s, b.e[2] * b.s))
      mesh.current.setMatrixAt(i, m)
      mesh.current.setColorAt(i, b.c)
    })
    mesh.current.instanceMatrix.needsUpdate = true
    mesh.current.instanceColor.needsUpdate = true
  }, [berries, seed])

  return (
    <group scale={scale} {...props}>
      <instancedMesh ref={mesh} args={[null, null, berries.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 18, 14]} />
        {berryMaterial('#ffffff')}
      </instancedMesh>
      {/* woody stalk, thicker at the cut end, with a little curl of tendril */}
      <mesh castShadow>
        <tubeGeometry args={[stalk, 24, 0.017, 8, false]} />
        <meshStandardMaterial color="#5a4327" roughness={0.9} />
      </mesh>
      <mesh position={[-0.285, 0.058, -0.042]} rotation={[0, 0.3, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.02, 12]} />
        <meshStandardMaterial color="#c9b48a" roughness={0.8} />
      </mesh>
      <Tendril position={[-0.02, 0.1, 0.0]} rotation={[0, 0.4, 0]} scale={0.5} />
    </group>
  )
}

/** A single loose berry resting on the stone. */
function Berry({ color = '#3d1a4a', size = 0.058, ...props }) {
  return (
    <mesh position-y={size * 0.95} scale={[size, size * 0.95, size]} {...props}>
      <sphereGeometry args={[1, 18, 14]} />
      {berryMaterial(color)}
    </mesh>
  )
}

/** A vine tendril: a thin green-brown coil. */
function Tendril({ scale = 1, ...props }) {
  const geo = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 40; i++) {
      const t = i / 40
      const a = t * Math.PI * 5.2
      const rad = 0.09 * (1 - t * 0.7)
      pts.push(new THREE.Vector3(t * 0.55, 0.012 + Math.abs(Math.sin(a * 0.5)) * 0.05 + 0.015, Math.sin(a) * rad))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.0065, 6, false)
  }, [])
  return (
    <mesh geometry={geo} scale={scale} castShadow {...props}>
      <meshStandardMaterial color="#6a7a34" roughness={0.7} />
    </mesh>
  )
}

/** A short dried vine cane with a couple of knots. */
function Twig({ scale = 1, ...props }) {
  const geo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(0.25, 0.03, 0.04), new THREE.Vector3(0.5, 0.025, -0.03), new THREE.Vector3(0.78, 0.03, 0.03), new THREE.Vector3(1.0, 0.022, 0)
    ])
    return new THREE.TubeGeometry(c, 60, 0.016, 7, false)
  }, [])
  return (
    <group scale={scale} {...props}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color="#6b4e2e" roughness={0.95} />
      </mesh>
      {[0.32, 0.7].map((x, i) => (
        <mesh key={i} position={[x, 0.036, i ? 0.02 : 0.04]}>
          <sphereGeometry args={[0.028, 10, 8]} />
          <meshStandardMaterial color="#5a3f24" roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

let leafGeo, leafTex
function getLeaf() {
  if (leafGeo) return { geo: leafGeo, tex: leafTex }
  const R = 0.34
  const shape = new THREE.Shape()
  const N = 110
  for (let i = 0; i <= N; i++) {
    const th = -Math.PI + (i / N) * Math.PI * 2 // 0 = +x, stem points to -y
    const phi = th - Math.PI / 2
    const s = (Math.cos(5 * phi) + 1) / 2 // five lobes, notch at the stem
    const tooth = 1 + 0.035 * Math.sin(phi * 34) // serrated edge
    const rr = R * (0.42 + 0.58 * Math.pow(s, 0.8)) * tooth
    const x = Math.cos(th) * rr, y = Math.sin(th) * rr
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)
  }
  const g = new THREE.ShapeGeometry(shape, 10)
  const p = g.attributes.position, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i)
    uv.setXY(i, x / (2 * R) + 0.5, y / (2 * R) + 0.5)
    // cupped, curling up at the tips, a little crinkle along the veins
    p.setZ(i, 0.55 * (x * x + y * y) + 0.05 * Math.sin(x * 24) * Math.cos(y * 19) + 0.03 * Math.sin(x * 9))
  }
  g.rotateX(-Math.PI / 2) // lie on the ledge
  g.computeVertexNormals()

  // painted leaf: green gradient with blotches + lighter veins fanning out from the stem
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const x = c.getContext('2d')
  const gr = x.createRadialGradient(256, 400, 20, 256, 256, 300)
  gr.addColorStop(0, '#93a34c')
  gr.addColorStop(0.6, '#647a2c')
  gr.addColorStop(1, '#4a5e22')
  x.fillStyle = gr
  x.fillRect(0, 0, 512, 512)
  const r = rng(11)
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(${r() > 0.5 ? '190,175,80' : '40,60,20'},${0.05 + r() * 0.08})`
    x.beginPath(); x.arc(r() * 512, r() * 512, 10 + r() * 34, 0, 7); x.fill()
  }
  x.strokeStyle = 'rgba(214,226,140,0.6)'
  x.lineCap = 'round'
  for (let k = 0; k < 5; k++) {
    const a = Math.PI / 2 + (k - 2) * 1.256
    x.lineWidth = k === 2 ? 9 : 6
    x.beginPath(); x.moveTo(256, 428); x.lineTo(256 + Math.cos(a) * 236, 428 - Math.sin(a) * 276); x.stroke()
    x.lineWidth = 2.6
    for (let j = 1; j < 8; j++) {
      const t = j / 8, bx = 256 + Math.cos(a) * 236 * t, by = 428 - Math.sin(a) * 276 * t
      x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + Math.cos(a + 0.9) * 52, by - Math.sin(a + 0.9) * 52); x.stroke()
      x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + Math.cos(a - 0.9) * 52, by - Math.sin(a - 0.9) * 52); x.stroke()
    }
  }
  leafTex = new THREE.CanvasTexture(c)
  leafTex.colorSpace = THREE.SRGBColorSpace
  leafTex.anisotropy = 4
  leafGeo = g
  return { geo: g, tex: leafTex }
}

function VineLeaf({ scale = 0.6, tint = '#ffffff', ...props }) {
  const { geo, tex } = useMemo(getLeaf, [])
  return (
    <mesh geometry={geo} scale={scale} castShadow receiveShadow {...props}>
      <meshStandardMaterial map={tex} color={tint} roughness={0.7} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** A wine cork lying on its side: natural side, darker end caps, a thin brand ring. */
function Cork({ stopper = false, ...props }) {
  return (
    <group position-y={0.075} rotation={[0, 0, Math.PI / 2]} {...props}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.075, 0.075, 0.24, 28]} />
        <meshStandardMaterial color="#c9a468" roughness={1} />
      </mesh>
      {/* end grain */}
      {[0.121, -0.121].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[i ? Math.PI / 2 : -Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.074, 24]} />
          <meshStandardMaterial color="#a8834c" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.0765, 0.0765, 0.012, 28]} />
        <meshStandardMaterial color="#5a1a24" roughness={0.9} />
      </mesh>
      {stopper && (
        <mesh position={[0, -0.155, 0]}>
          <cylinderGeometry args={[0.09, 0.075, 0.07, 24]} />
          <meshStandardMaterial color="#3a1518" roughness={0.6} metalness={0.2} />
        </mesh>
      )}
    </group>
  )
}

export default function Props({ mobile = false }) {
  if (mobile) {
    return (
      <>
        <GrapeBunch seed={1} position={[-1.75, 0, 1.4]} rotation={[0, 0.5, 0]} scale={0.8} />
        <VineLeaf position={[-1.3, 0.005, 1.55]} rotation={[0, 0.9, 0]} scale={0.5} />
        <Berry position={[-1.05, 0, 1.3]} size={0.04} />
        <Cork position={[0.2, 0, 1.5]} rotation={[0, 0.4, 0]} />
        <Twig position={[0.55, 0, 1.55]} rotation={[0, 0.15, 0]} scale={0.5} />
        <GrapeBunch seed={2} color="#a9b95a" position={[1.4, 0, 1.4]} rotation={[0, 2.6, 0]} scale={0.8} />
        <Berry color="#a9b95a" position={[1.05, 0, 1.55]} size={0.04} />
      </>
    )
  }
  return (
    <>
      {/* left end of the ledge */}
      <GrapeBunch seed={1} position={[-3.95, 0, 0.3]} rotation={[0, 0.6, 0]} scale={1.7} />
      <VineLeaf position={[-3.65, 0.005, 1.2]} rotation={[0, 0.5, 0]} scale={0.95} />
      <VineLeaf position={[-3.95, 0.005, -0.75]} rotation={[0, 2.2, 0]} scale={0.8} tint="#e3e6b0" />
      <Berry position={[-3.05, 0, 0.75]} size={0.062} />
      <Berry position={[-2.9, 0, 1.0]} size={0.055} color="#4a2058" />
      <Berry position={[-3.2, 0, 1.55]} size={0.058} />
      <Tendril position={[-3.3, 0, -0.3]} rotation={[0, 2.6, 0]} scale={1.3} />
      {/* front strip */}
      <Cork position={[-0.75, 0, 1.68]} rotation={[0, 0.35, 0]} scale={1.6} />
      <Twig position={[0.3, 0, 1.75]} rotation={[0, 0.12, 0]} scale={0.85} />
      <VineLeaf position={[1.5, 0.005, 1.62]} rotation={[0, 3.4, 0]} scale={0.8} tint="#f0d7a0" />
      <Cork stopper position={[2.05, 0, 1.72]} rotation={[0, -0.5, 0]} scale={1.6} />
      <Berry position={[-0.2, 0, 1.55]} size={0.05} color="#a9b95a" />
      {/* right end */}
      <GrapeBunch seed={2} color="#a9b95a" position={[3.2, 0, 0.95]} rotation={[0, 2.9, 0]} scale={1.7} />
      <VineLeaf position={[3.35, 0.005, -0.25]} rotation={[0, 1.2, 0]} scale={0.9} />
      <VineLeaf position={[2.6, 0.005, 1.5]} rotation={[0, 0.2, 0]} scale={0.6} tint="#dfe6a8" />
      <Berry position={[2.55, 0, 0.6]} size={0.06} color="#a9b95a" />
      <Berry position={[2.3, 0, 0.9]} size={0.054} color="#b7c565" />
      <Tendril position={[3.6, 0, 1.6]} rotation={[0, 3.6, 0]} scale={1.1} />
    </>
  )
}
