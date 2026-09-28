import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import Scene from './Scene'
import { LOW } from './perf'

export default function Experience() {
  // Sharp by default (up to 2x on phones); it only steps down, never below 1x, if the frame rate really drops
  const top = LOW ? 2 : 1.5
  const [dpr, setDpr] = useState(top)
  return (
    <div className="stage">
      <Canvas
        // variance shadow maps: soft, blurred shadow edges like the diffuse light in the banner photo
        // variance shadow maps: soft, blurred shadow edges like the diffuse light in the banner photo
        shadows="variance"
        dpr={[1, dpr]}
        camera={{ fov: 30, position: [0, 2.0, 11.6], near: 0.1, far: 80 }}
        // Neutral tone mapping keeps the sand / travertine colours true (ACES would grey them).
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
        // the see-through glass needs an extra scene pass: render it at half resolution (it is refracted / blurry anyway)
        onCreated={({ gl }) => { gl.transmissionResolutionScale = LOW ? 0.45 : 0.5 }}
      >
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setDpr((d) => Math.max(1, d - 0.25))}
          onIncline={() => setDpr((d) => Math.min(top, d + 0.25))}
        />
        <Scene />
      </Canvas>
    </div>
  )
}
