// Shared, non-reactive input state used by the 3D player and the artwork meshes.
export const input = {
  move: { x: 0, y: 0 }, // joystick vector, -1..1
  keys: new Set(),
  hoveringArtwork: false,
  dragging: false,
  dragDistance: 0,
  locked: false,
  listen: {
    onLockChange: null,
  },
}

// Last pointer position, shared with the hover marker that the UI draws above
// the canvas.
export const pointer = { x: 0, y: 0 }

// Artwork hover is published through a tiny store so the DOM marker can react to
// it without re-rendering the whole app.
const hoverListeners = new Set()
export const artworkHover = {
  subscribe(fn) {
    hoverListeners.add(fn)
    return () => hoverListeners.delete(fn)
  },
  get: () => input.hoveringArtwork,
  set(value) {
    if (input.hoveringArtwork === value) return
    input.hoveringArtwork = value
    hoverListeners.forEach((fn) => fn())
  },
}

export const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(hover: none), (pointer: coarse)').matches || 'ontouchstart' in window)
