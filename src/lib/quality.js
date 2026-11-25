// Rendering quality ladder for the 3D scene. Step 0 is full quality; every step
// down gives something up in the order that costs the most frames first: pixel
// ratio, then shadows, then the extra wall detail maps.

export const QUALITY_STEPS = [
  { dpr: 1.6, shadows: true, maps: true },
  { dpr: 1.25, shadows: true, maps: true },
  { dpr: 1, shadows: false, maps: true },
  { dpr: 1, shadows: false, maps: false },
]

export const MAX_STEP = QUALITY_STEPS.length - 1

// The manual setting in the help panel.
export const PRESETS = { high: 0, medium: 2, low: MAX_STEP }

const KEY = 'ariana:quality'

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (parsed && typeof parsed === 'object') {
      const mode = parsed.mode === 'auto' ? 'auto' : PRESETS[parsed.mode] !== undefined ? parsed.mode : 'auto'
      const level = Number.isInteger(parsed.level) ? Math.min(MAX_STEP, Math.max(0, parsed.level)) : 0
      return { mode, level }
    }
  } catch {
    // fall through to the automatic default
  }
  return { mode: 'auto', level: 0 }
}

let state = read()
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // private mode: quality still applies for this visit
  }
}

export const quality = {
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  getMode: () => state.mode,
  getLevel: () => state.level,
  /** Manual choice from the help panel; `auto` hands control back to the monitor. */
  setMode(mode) {
    if (mode !== 'auto' && PRESETS[mode] === undefined) return
    if (state.mode === mode) return
    state = { ...state, mode }
    persist()
    emit()
  },
  /** Only the automatic monitor moves the adaptive level. */
  setLevel(level) {
    const next = Math.min(MAX_STEP, Math.max(0, level))
    if (state.level === next) return
    state = { ...state, level: next }
    persist()
    emit()
  },
}

/** Resolve the step that should be rendered on this device. */
export function currentStep({ touch, mode, level }) {
  const step = QUALITY_STEPS[mode === 'auto' ? level : PRESETS[mode]] || QUALITY_STEPS[0]
  return {
    ...step,
    dpr: touch ? Math.min(step.dpr, 1.25) : step.dpr,
    shadows: touch ? false : step.shadows,
  }
}
