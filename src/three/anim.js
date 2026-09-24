import gsap from 'gsap'

// Keep tweens wall-clock accurate even if a frame is slow (heavy shader compile, weak GPU).
gsap.ticker.lagSmoothing(0)

// Shared, mutable animation state. GSAP tweens these plain numbers and the
// R3F `useFrame` loops read them every frame (no React re-renders involved).
export const anim = {
  zoom: 0,   // camera pushes in on the clicked bottle (0 = wide shot, 1 = close-up)
  detail: 0, // 0 = showcase, 1 = split detail view (selected slot slides to the left half)
  lift: 0,   // bottle rises off its pedestal
  tilt: 0,   // bottle tips over the glass
  glass: 0,  // glass scales in
  stream: 0, // thin stream of wine
  fill: 0,   // glass fill level
  focus: { x: 0, y: 0, z: 0 } // world position of the selected bottle in the showcase (camera target)
}

let tl
export function playDetail(open) {
  tl?.kill()
  tl = gsap.timeline()
  if (open) {
    tl.to(anim, { zoom: 1, duration: 1.0, ease: 'power3.inOut' }) // camera flies into the bottle
      .add('move', '-=0.15')
      // ...then the camera eases back out while the bottle glides into the left half
      .to(anim, { detail: 1, duration: 1.5, ease: 'power3.inOut' }, 'move')
      .to(anim, { zoom: 0, duration: 1.5, ease: 'power3.inOut' }, 'move')
      .to(anim, { glass: 1, duration: 0.9, ease: 'back.out(1.6)' }, 'move+=0.9')
      .to(anim, { lift: 1, duration: 0.9, ease: 'power2.inOut' }, 'move+=1.1')
      .to(anim, { tilt: 1, duration: 1.3, ease: 'power2.inOut' }, '>-0.1')
      .to(anim, { stream: 1, duration: 0.25, ease: 'none' })
      .to(anim, { fill: 1, duration: 3.4, ease: 'sine.inOut' }, '<')
      .to(anim, { stream: 0, duration: 0.35, ease: 'none' })
      .to(anim, { tilt: 0, duration: 1.2, ease: 'power2.inOut' })
      .to(anim, { lift: 0, duration: 0.8, ease: 'power2.inOut' })
  } else {
    tl.to(anim, { stream: 0, fill: 0, glass: 0, tilt: 0, lift: 0, zoom: 0, duration: 0.8, ease: 'power2.inOut' })
      .to(anim, { detail: 0, duration: 1.2, ease: 'power3.inOut' }, 0.3)
  }
}

/**
 * Layout helpers (world units). `s` is the uniform scale of a slot.
 * board: bottles occupy the right ~2/3 of the screen (left is for the brand) or the full width on phones.
 * detail: the selected slot moves to the left half (top half on phones).
 */
export function computeLayout(viewport, size) {
  const mobile = size.width < 820
  const SPAN = 8.0 // world width of the six pedestals
  if (mobile) {
    return {
      board: { x: 0, y: -0.4, s: Math.min(1, (viewport.width * 0.94) / SPAN) },
      detail: { x: -0.9, y: 1.6, s: Math.min(0.62, viewport.width / 8) }
    }
  }
  return {
    board: { x: viewport.width * 0.17, y: 0, s: Math.min(1, (viewport.width * 0.66) / SPAN) },
    detail: { x: -viewport.width / 4 - 0.7 * Math.min(1, viewport.width / 11), y: 0, s: Math.min(1, viewport.width / 11) }
  }
}
