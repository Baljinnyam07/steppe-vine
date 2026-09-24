import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

// Photo-scanned CC0 stone (see public/textures/CREDITS.txt): colour + normal + roughness per finish.
// `tile` = world units covered by one repeat of the texture, `normal` = relief strength.
const FINISH = {
  travertine: { tile: 6.0, normal: 1.3 },
  plain: { tile: 6.0, normal: 0.8 },
  sandstone: { tile: 3.2, normal: 1.6 }
}
const KINDS = Object.keys(FINISH)
const urls = (k) => [`/textures/${k}_color.jpg`, `/textures/${k}_normal.jpg`, `/textures/${k}_rough.jpg`]
KINDS.forEach((k) => useTexture.preload(urls(k)))

// How much the edges/corners are chipped, per stone finish.
const CHIP = { travertine: 0.03, plain: 0.012, sandstone: 0.07 }
const EDGE_W = 0.16 // width of the band along each edge that can be chipped

// smooth-ish pseudo noise in [0,1] from a position (no dependencies, deterministic)
const noise = (x, y, z, s) => {
  const a = Math.sin(x * 17.3 + s) * Math.sin(y * 13.1 + s * 1.7) * Math.sin(z * 15.7 + s * 0.6)
  const b = Math.sin(x * 41.0 + z * 29.0 + s) * Math.sin(y * 37.0 - x * 23.0)
  return Math.min(1, Math.abs(a) * 1.4 + Math.abs(b) * 0.5)
}

/**
 * A box with a slightly irregular, chipped edge: a finely segmented BoxGeometry whose vertices
 * near an edge are pulled inward by noise. The pull depends on position only, so faces that share an
 * edge move together and never crack. UVs are projected in world units first (dominant-axis
 * mapping), so the pits keep the same size on every face however long or thin the block is.
 */
function chippedBox(w, h, d, seed, kind) {
  const seg = (len) => THREE.MathUtils.clamp(Math.round(len / 0.07), 2, 90)
  const g = new THREE.BoxGeometry(w, h, d, seg(w), seg(h), seg(d))
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  const o = (seed * 0.37) % 1
  const TILE = FINISH[kind]?.tile ?? 6
  const hx = w / 2, hy = h / 2, hz = d / 2
  const chip = CHIP[kind] ?? 0.03
  const E = 1e-4

  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i))
    let u, v
    if (ay >= ax && ay >= az) { u = x; v = z } else if (ax >= az) { u = z; v = y } else { u = x; v = y }
    uv.setXY(i, u / TILE + o, v / TILE + o * 0.7)

    // distance to the nearest edge along the face (second smallest of the three face distances)
    const d3 = [hx - Math.abs(x), hy - Math.abs(y), hz - Math.abs(z)].sort((m, k) => m - k)
    const edge = Math.max(0, 1 - d3[1] / EDGE_W)
    if (edge <= 0) continue
    const amt = chip * edge * edge * noise(x, y, z, seed)
    // direction = sum of the face normals this vertex lies on (position-based, same for shared verts)
    const dx = hx - Math.abs(x) < E ? Math.sign(x) : 0
    const dy = hy - Math.abs(y) < E ? Math.sign(y) : 0
    const dz = hz - Math.abs(z) < E ? Math.sign(z) : 0
    p.setXYZ(i, x - dx * amt, y - dy * amt, z - dz * amt)
  }
  uv.needsUpdate = true
  g.computeVertexNormals()

  // Vertex colours: sides darken toward the base (dust / occlusion), plus a slow patchy drift so the
  // block isn't one flat tone. Chipped edges catch a little extra light.
  const col = new Float32Array(p.count * 3)
  const nn = g.attributes.normal
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const side = 1 - Math.abs(nn.getY(i)) // 0 on top/bottom faces, 1 on sides
    const above = THREE.MathUtils.clamp((y + hy) / 0.4, 0, 1)
    const ao = 1 - side * (1 - above) * 0.28
    const drift = 0.95 + 0.05 * Math.sin(x * 2.1 + seed) * Math.sin(z * 1.7 + y * 2.3 + seed * 0.7)
    const e = [hx - Math.abs(x), hy - Math.abs(y), hz - Math.abs(z)].sort((a, b) => a - b)[1]
    const rim = 1 + 0.05 * Math.max(0, 1 - e / 0.05)
    const k = ao * drift * rim
    col[i * 3] = k; col[i * 3 + 1] = k * 0.99; col[i * 3 + 2] = k * 0.97
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}

/**
 * Stone block in one of three finishes ('travertine' | 'plain' | 'sandstone') with chipped edges.
 * The caller may scale the mesh (the detail view shrinks the pedestal).
 */
export const StoneBlock = forwardRef(function StoneBlock(
  { width = 1.6, height, depth = 1.6, tint = '#ffffff', seed = 0, kind = 'travertine', ...props },
  ref
) {
  const mesh = useRef()
  useImperativeHandle(ref, () => mesh.current)
  const [map, normalMap, roughnessMap] = useTexture(urls(kind), (ts) => {
    ts.forEach((t, i) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.anisotropy = 8
      if (i === 0) t.colorSpace = THREE.SRGBColorSpace
    })
  })
  const normalScale = useMemo(() => new THREE.Vector2(FINISH[kind].normal, FINISH[kind].normal), [kind])
  const geometry = useMemo(() => chippedBox(width, height, depth, seed, kind), [width, height, depth, seed, kind])
  useLayoutEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh ref={mesh} geometry={geometry} castShadow receiveShadow {...props}>
      <meshStandardMaterial
        map={map}
        normalMap={normalMap}
        normalScale={normalScale}
        roughnessMap={roughnessMap}
        vertexColors
        color={tint}
        roughness={1}
        metalness={0}
      />
    </mesh>
  )
})
