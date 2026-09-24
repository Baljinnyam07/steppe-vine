import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Scene from './Scene'

export default function Experience() {
  return (
    <div className="stage">
      <Canvas
        // variance shadow maps: soft, blurred shadow edges like the diffuse light in the banner photo
        // variance shadow maps: soft, blurred shadow edges like the diffuse light in the banner photo
        shadows="variance"
        dpr={[1, 2]}
        camera={{ fov: 30, position: [0, 2.0, 11.6], near: 0.1, far: 80 }}
        // Neutral tone mapping keeps the sand / travertine colours true (ACES would grey them).
        gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
