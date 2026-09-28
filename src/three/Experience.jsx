import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import Scene from './Scene'
import { LOW } from './perf'

export default function Experience() {
  // pixel ratio starts modest and drops further if the device can't keep up
  const [dpr, setDpr] = useState(LOW ? 1.15 : 1.5)
  return (
    <div className="stage">
      <Canvas
        // variance shadow maps: soft, blurred shadow edges like the diffuse light in the banner photo
        // variance shadow maps: soft, blurred shadow edges like the diffuse light in the banner photo
        shadows="variance"
        dpr={[0.75, dpr]}
        camera={{ fov: 30, position: [0, 2.0, 11.6], near: 0.1, far: 80 }}
        // Neutral tone mapping keeps the sand / travertine colours true (ACES would grey them).
        gl={{ antialias: !LOW, powerPreference: 'high-performance', toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
        // the see-through glass needs an extra scene pass: render it at half resolution (it is refracted / blurry anyway)
        onCreated={({ gl }) => { gl.transmissionResolutionScale = LOW ? 0.3 : 0.5 }}
      >
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setDpr((d) => Math.max(0.75, d - 0.2))}
          onIncline={() => setDpr((d) => Math.min(LOW ? 1.15 : 1.5, d + 0.1))}
        />
        <Scene />
      </Canvas>
    </div>
  )
}
