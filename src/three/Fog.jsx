import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

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

/** Low rising mist: soft point sprites animated entirely on the GPU. */
export default function Fog({ count = 320, width = 20, depth = 6, height = 1.9, opacity = 0.15, color = '#f6ead8' }) {
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
