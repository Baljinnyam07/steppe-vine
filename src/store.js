import { create } from 'zustand'

// view: 'board' (static showcase, all bottles visible) | 'detail' (split: 3D pour scene + story)
export const useStore = create((set, get) => ({
  index: 0,        // selected bottle (valid while view === 'detail')
  hovered: null,   // bottle index under the pointer (for the caption)
  view: 'board',
  orderOpen: false,
  ready: false,    // 3D scene fully loaded (hides the loading screen)

  setReady: () => set({ ready: true }),
  setHovered: (hovered) => set({ hovered }),
  // Click on a bottle: remember which one and switch view. three/anim.js reacts (camera zoom + pour).
  openDetail: (index) => get().view === 'board' && set({ index, view: 'detail', hovered: null }),
  closeDetail: () => set({ view: 'board' }),

  openOrder: () => set({ orderOpen: true }),
  closeOrder: () => set({ orderOpen: false })
}))
