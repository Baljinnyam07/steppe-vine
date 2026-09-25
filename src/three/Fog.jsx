import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { MathUtils } from 'three'
import { anim } from './anim'

const vertex = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uScale;
  uniform float uHeight;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    vec3 p = position;
    float rise = mod(aSeed * uHeight + uTime * (0.08 + aSeed * 0.1), uHeight);
    p.y += rise;
    p.x += sin(uTime * 0.25 + aSeed * 40.0) * 0.6 + rise * 0.15 * sin(aSeed * 12.0);
    p.z += cos(uTime * 0.2 + aSeed * 25.0) * 0.4;
    float t = rise / uHeight;
    vAlpha = smoothstep(0.0, 0.18, t) * (1.0 - smoothstep(0.3, 1.0, t));
    vSeed = aSeed;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * (1.0 + t * 0.9) * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv) * 2.0;
    float wob = 0.85 + 0.15 * sin(atan(uv.y, uv.x) * 3.0 + vSeed * 30.0);
    float a = 1.0 - smoothstep(0.0, 1.0, r / wob); // (edge0 < edge1: GLSL leaves the reverse undefined)
    a = a * 0.8 + a * a * 0.2;
    gl_FragColor = vec4(uColor, a * vAlpha * uOpacity);
  }
`

/** Small rising wisps of smoke: soft point sprites animated entirely on the GPU. */
function Wisps({ count = 70, width = 20, depth = 6, height = 1.9, opacity = 0.1, color = '#f6ead8' }) {
  const mat = useRef()
  const size = useThree((s) => s.size)

  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const sz = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * width
      pos[i * 3 + 1] = -0.1
      pos[i * 3 + 2] = (Math.random() - 0.5) * depth
      seed[i] = Math.random()
      sz[i] = 2 + Math.random() * 2.4
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1))
    return g
  }, [count, width, depth])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScale: { value: 1 },
      uHeight: { value: height },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity }
    }),
    [height, color, opacity]
  )

  // NOTE: update through the material ref; R3F may hand the material its own uniforms object.
  useFrame((state) => {
    const u = mat.current.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uScale.value = size.height * 0.55 * state.gl.getPixelRatio()
  })

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={5}>
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} />
    </points>
  )
}


// ---------------------------------------------------------------------------------------------
// Layered fog banks. Each bank is a big vertical plane with a noise shader: domain-warped fractal
// noise drifting sideways and billowing upwards, dense at the floor and thinning with height.
// Banks sit at different depths (behind the pedestals, between the rows, in front of their base),
// which gives the mist real depth and parallax as the camera moves.
// ---------------------------------------------------------------------------------------------
const bankVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const bankFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime, uDensity, uScale, uSpeed, uSeed, uEnergy, uAspect, uTop, uW, uH, uStir, uWind;
  uniform vec2 uPointer; // pointer position in this plane's uv space
  uniform vec3 uLow, uHigh;

  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 3; i++) { s += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
    return s;
  }
  float fbm2(vec2 p) { return 0.6 * noise(p) + 0.4 * noise(p * 2.07 + vec2(3.7, 8.1)); }

  void main() {
    float t = uTime * uSpeed * (1.0 + uEnergy * 2.2);
    // where the pointer is, in world units: fog is parted and swirled around it
    vec2 dv = vec2((vUv.x - uPointer.x) * uW, (vUv.y - uPointer.y) * uH);
    float r2 = dot(dv, dv);
    float radius = 1.3 + uStir * 1.6;
    float push = exp(-r2 / (radius * radius));
    vec2 swirl = vec2(-dv.y, dv.x) * push * (0.35 + uStir * 1.4);

    vec2 p = vec2(vUv.x * uAspect, vUv.y) * uScale + vec2(t + uWind * 0.6, 0.0) + uSeed + swirl * 0.5;
    // domain warp: the billows fold over themselves like real fog
    vec2 q = vec2(fbm(p + vec2(0.0, t * 0.6)), fbm(p + vec2(5.2, 1.3) - vec2(t * 0.4, 0.0)));
    float n = fbm(p + 1.7 * q + vec2(0.0, -t * 0.35));
    // second, finer layer of detail (wisps riding on the billows)
    float fine = fbm2(p * 2.6 + q * 2.0 + vec2(t * 1.6, t * 0.5));

    float h = vUv.y;
    float profile = pow(1.0 - clamp(h / uTop, 0.0, 1.0), 1.5);          // dense at the floor, thin above
    float d = smoothstep(0.2, 0.7, n) * (0.7 + 0.6 * fine) * profile;
    d *= smoothstep(0.0, 0.04, h);                                        // no hard line where it meets the floor
    d *= smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);       // fade at the ends of the plane
    d *= uDensity * (1.0 + uEnergy * 0.7);
    // slow gusts: the fog thins out for a while, then drifts back in
    float gust = sin(uTime * 0.17 + uSeed * 0.7) * 0.5 + 0.5;
    d *= mix(1.0, 0.45, smoothstep(0.55, 1.0, gust));
    // the mouse / finger cuts a hole in it that slowly heals as the fog flows back
    d *= 1.0 - push * (0.4 + 0.5 * uStir);

    // warm light: a little brighter (sun-lit) where the fog is thin and high, cream where it is thick
    vec3 col = mix(uLow, uHigh, clamp(h / uTop + (fine - 0.5) * 0.4, 0.0, 1.0));
    gl_FragColor = vec4(col, clamp(d, 0.0, 0.92));
  }
`

// [z, height of the bank, density, drift speed, noise scale, seed]
const BANKS = [
  [-3.4, 4.2, 0.75, 0.014, 2.4, 3.0],
  [-1.5, 3.2, 0.8, 0.022, 3.0, 11.0],
  [0.05, 2.0, 0.75, 0.03, 3.6, 23.0],
  [2.3, 1.6, 0.6, 0.04, 4.2, 37.0],
  [3.7, 1.0, 0.42, 0.055, 4.8, 51.0]
]
const W = 26

function FogBank({ z, height, density, speed, scale, seed }) {
  const mat = useRef()
  const st = useRef({ stir: 0, px: 0, py: 0, ux: 0.5, uy: 0.5 })
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDensity: { value: density },
      uScale: { value: scale },
      uSpeed: { value: speed },
      uSeed: { value: seed },
      uEnergy: { value: 0 },
      uAspect: { value: W / height },
      uTop: { value: 1 },
      uW: { value: W },
      uH: { value: height },
      uStir: { value: 0 },
      uWind: { value: 0 },
      uPointer: { value: new THREE.Vector2(-5, -5) },
      uLow: { value: new THREE.Color('#ecdcc2') },
      uHigh: { value: new THREE.Color('#fff4e0') }
    }),
    [density, scale, speed, seed, height]
  )
  const tmp = useMemo(() => new THREE.Vector3(), [])
  // (update through the material ref: R3F may hand the material its own uniforms object)
  useFrame((state, dt) => {
    const u = mat.current.uniforms
    const s = st.current
    u.uTime.value = state.clock.elapsedTime

    // pointer -> point on this bank's plane (ray from the camera through the pointer)
    const { camera, pointer } = state
    tmp.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize()
    const t = (z - camera.position.z) / tmp.z
    const wx = camera.position.x + tmp.x * t
    const wy = camera.position.y + tmp.y * t
    u.uPointer.value.set((wx + W / 2) / W, (wy + 0.02) / height)

    // how fast the pointer is moving: stirs the fog harder, then settles
    const speedNdc = Math.hypot(pointer.x - s.px, pointer.y - s.py) / Math.max(dt, 1e-3)
    s.px = pointer.x; s.py = pointer.y
    s.stir += (Math.min(speedNdc * 0.35, 1) - s.stir) * Math.min(1, dt * 4)
    u.uStir.value = s.stir

    // opening a bottle stirs the fog up, then blows it away sideways; closing lets it drift back
    const d = anim.detail
    u.uEnergy.value = Math.sin(Math.PI * d)
    u.uWind.value = d * 6
    u.uDensity.value = density * (1 - 0.85 * MathUtils.smoothstep(d, 0.1, 0.8))
  })
  return (
    <mesh position={[0, height / 2 - 0.02, z]} renderOrder={4} frustumCulled={false}>
      <planeGeometry args={[W, height]} />
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={bankVertex} fragmentShader={bankFragment} transparent depthWrite={false} />
    </mesh>
  )
}

export default function Fog() {
  // phones: three banks instead of five (each bank is a full noise shader over a big part of the screen)
  const small = useThree((s) => s.size.width < 820)
  const banks = small ? BANKS.filter((_, i) => i === 1 || i === 2 || i === 3) : BANKS
  return (
    <>
      {banks.map(([z, height, density, speed, scale, seed]) => (
        <FogBank key={z} z={z} height={height} density={density} speed={speed} scale={scale} seed={seed} />
      ))}
      <Wisps />
    </>
  )
}
