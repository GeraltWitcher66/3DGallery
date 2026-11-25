// Which view the visitor is in. The lightweight 2D index is the default; the
// choice is remembered so returning visitors land where they left off.

const KEY = 'ariana:view'

function readStored() {
  try {
    return localStorage.getItem(KEY) === 'scene' ? 'scene' : 'simple'
  } catch {
    return 'simple'
  }
}

let state = { mode: readStored(), note: '' }
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())

export const viewMode = {
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  get: () => state.mode,
  getNote: () => state.note,
  /** `reason` is only set when the switch was forced (no WebGL, lost context). */
  set(mode, reason = '') {
    const next = mode === 'scene' ? 'scene' : 'simple'
    if (next === state.mode && reason === state.note) return
    state = { mode: next, note: reason }
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // private mode: the view still switches for this visit
    }
    emit()
  },
  clearNote() {
    if (!state.note) return
    state = { ...state, note: '' }
    emit()
  },
}
