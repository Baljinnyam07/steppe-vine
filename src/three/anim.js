import gsap from 'gsap'

// If one frame takes very long (first shader compile, tab switch) GSAP pretends it took 33 ms, so the
// animation carries on smoothly from where it was instead of jumping to the end ("catching").
gsap.ticker.lagSmoothing(500, 33)

// Shared, mutable animation state. GSAP tweens these plain numbers and the
// R3F `useFrame` loops read them every frame (no React re-renders involved).
export const anim = {
  zoom: 0,   // camera pushes in on the clicked bottle (0 = wide shot, 1 = close-up)
  detail: 0, // 0 = showcase, 1 = detail view (the selected bottle sits alone in the left half)
  focus: { x: 0, y: 0, z: 0 } // world position of the selected bottle, updated every frame (camera target)
}

let tl
/**
 * One continuous move (no stop-and-go): the selected bottle glides to the left half over ~2 s while
 * everything else slides away sideways, and the camera swings in towards the (moving) bottle and back
 * out again as a single smooth bell curve.
 */
export function playDetail(open) {
  tl?.kill()
  tl = gsap.timeline()
  if (open) {
    tl.to(anim, { detail: 1, duration: 2.0, ease: 'power3.inOut' }, 0)
      .to(anim, { zoom: 0.75, duration: 1.0, ease: 'sine.inOut' }, 0)
      .to(anim, { zoom: 0, duration: 1.0, ease: 'sine.inOut' }, 1.0)
  } else {
    tl.to(anim, { detail: 0, duration: 1.8, ease: 'power3.inOut' }, 0)
      .to(anim, { zoom: 0.45, duration: 0.9, ease: 'sine.inOut' }, 0)
      .to(anim, { zoom: 0, duration: 0.9, ease: 'sine.inOut' }, 0.9)
  }
}

/**
 * Layout helpers (world units). `s` is the uniform scale of a slot.
 * board: bottles occupy the right ~2/3 of the screen (left is for the brand) or the full width on phones.
 * detail: the selected slot moves to the centre of the left half (top half on phones).
 */
export function computeLayout(viewport, size) {
  const mobile = size.width < 820
  const SPAN = 8.0 // world width of the six pedestals (desktop)
  if (mobile) {
    return {
      board: { x: 0, y: 0, s: Math.min(1.1, (viewport.width * 0.96) / 4.1) }, // zig-zag layout, see Showcase PLACES_M
      detail: { x: 0, y: 1.9, s: Math.min(0.6, viewport.width / 4.6), avail: 2.3 } // top ~44% of the screen; the parchment fills the rest
    }
  }
  return {
    board: { x: viewport.width * 0.17, y: 0, s: Math.min(1, (viewport.width * 0.66) / SPAN) },
    detail: { x: -viewport.width / 4 + 0.3, y: 0, s: Math.min(1.2, viewport.width / 10), avail: 3.9 }
  }
}
