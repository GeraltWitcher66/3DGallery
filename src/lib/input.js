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

export const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(hover: none), (pointer: coarse)').matches || 'ontouchstart' in window)
