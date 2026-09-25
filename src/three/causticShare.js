import * as THREE from 'three'

/*
 * Coloured light through the glass, landing inside the bottle's shadow (the look of three.js'
 * webgpu_volume_caustics, done with plain WebGL):
 *
 *  1. Every bottle has an invisible copy of its glass on layer CAUSTIC_LAYER (see <CausticProxy/>).
 *  2. Each frame the scene is drawn from the sun's point of view into a small render target, showing only
 *     those copies. rgb = light that comes through the glass (bright, wine-coloured, moving like water light),
 *     alpha = how far from the sun the glass is.
 *  3. The stones and the floor sample that texture at their own position (as seen from the sun). Where a
 *     surface lies behind a piece of glass, it receives the coloured light: right inside the glass shadow,
 *     on whatever surface the shadow falls on, and fading with distance.
 */
export const CAUSTIC_LAYER = 2
const SUN_POS = new THREE.Vector3(-8, 7.5, 6) // same as the directional light in Scene.jsx

export const U = {
  map: { value: null },
  mat: { value: new THREE.Matrix4() },
  time: { value: 0 },
  strength: { value: 0.75 },
  toSun: { value: SUN_POS.clone().normalize() }
}

const cam = new THREE.OrthographicCamera(-8, 8, 8, -4, 1, 35) // = the sun's shadow camera
cam.position.copy(SUN_POS)
cam.lookAt(0, 0, 0)
cam.layers.set(CAUSTIC_LAYER)
cam.updateMatrixWorld(true)
cam.updateProjectionMatrix()
U.mat.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)

let rt = null
export function renderCaustics(gl, scene, time) {
  if (!rt) {
    rt = new THREE.WebGLRenderTarget(512, 512, { type: THREE.HalfFloatType, depthBuffer: true })
    U.map.value = rt.texture
  }
  U.time.value = time
  const prev = { rt: gl.getRenderTarget(), color: gl.getClearColor(new THREE.Color()), alpha: gl.getClearAlpha(), auto: gl.shadowMap.autoUpdate }
  const bg = scene.background
  scene.background = null // a background colour would overwrite the transparent clear
  gl.shadowMap.autoUpdate = false
  gl.setRenderTarget(rt)
  gl.setClearColor(0x000000, 0)
  gl.clear()
  gl.render(scene, cam)
  scene.background = bg
  gl.setRenderTarget(prev.rt)
  gl.setClearColor(prev.color, prev.alpha)
  gl.shadowMap.autoUpdate = prev.auto
}

/** Patch a MeshStandardMaterial shader so it receives the caustic light. */
export function receiveCaustics(sh) {
  sh.uniforms.uCausticMap = U.map
  sh.uniforms.uCausticMat = U.mat
  sh.uniforms.uCausticStrength = U.strength
  sh.uniforms.uToSun = U.toSun
  sh.vertexShader = sh.vertexShader
    .replace('void main() {', 'varying vec3 vCW;\nvoid main() {')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vCW = (modelMatrix * vec4(transformed, 1.0)).xyz;')
  sh.fragmentShader = sh.fragmentShader
    .replace('void main() {', 'uniform sampler2D uCausticMap;\nuniform mat4 uCausticMat;\nuniform float uCausticStrength;\nuniform vec3 uToSun;\nvarying vec3 vCW;\nvoid main() {')
    .replace('#include <opaque_fragment>', `
      {
        vec4 cp = uCausticMat * vec4(vCW, 1.0);
        vec2 cuv = cp.xy * 0.5 + 0.5;
        if (cuv.x > 0.0 && cuv.x < 1.0 && cuv.y > 0.0 && cuv.y < 1.0) {
          // soft edges: average a 5x5 neighbourhood (no hard silhouette, no thin blades)
          vec3 acc = vec3(0.0);
          float accA = 0.0, cov = 0.0;
          for (int ix = -2; ix <= 2; ix++) {
            for (int iy = -2; iy <= 2; iy++) {
              vec4 t = texture2D(uCausticMap, cuv + vec2(float(ix), float(iy)) * 0.0045);
              acc += t.rgb;
              accA += t.a;
              cov += step(0.001, t.a);
            }
          }
          vec4 cc = vec4(acc / 25.0, accA / max(cov, 1.0));
          float d = (cp.z * 0.5 + 0.5) - cc.a;
          float behind = step(0.001, cc.a) * smoothstep(0.003, 0.014, d) * exp(-max(d, 0.0) * 16.0);
          vec3 toSunV = normalize((viewMatrix * vec4(uToSun, 0.0)).xyz);
          float facing = max(dot(normalize(normal), toSunV), 0.0);
          outgoingLight += cc.rgb * behind * facing * uCausticStrength;
        }
      }
      #include <opaque_fragment>`)
}
