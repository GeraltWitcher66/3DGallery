// The 3D bundle lives behind this one function so the 2D view never imports
// three. Hovering or focusing the entrance button starts the download early.
let pending = null

export function loadScene3D() {
  if (!pending) {
    pending = import('../App.jsx').catch((error) => {
      pending = null
      throw error
    })
  }
  return pending
}
