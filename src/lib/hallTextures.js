import { useSyncExternalStore } from 'react'

// Artwork textures are loaded per hall, and a hall only asks for them once the
// visitor is close to its entrance (or the route points at it). Unlocks are
// permanent: paintings that were loaded stay mounted so walking back never
// shows empty frames again.
const unlocked = new Set()
const listeners = new Set()

export function unlockHall(hallId) {
  if (!hallId || unlocked.has(hallId)) return
  unlocked.add(hallId)
  listeners.forEach((fn) => fn())
}

export function isHallUnlocked(hallId) {
  return unlocked.has(hallId)
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useHallUnlocked(hallId) {
  return useSyncExternalStore(
    subscribe,
    () => unlocked.has(hallId),
    () => true
  )
}

/** Number of unlocked halls, used as a cheap "something new is loading" signal. */
export function useUnlockVersion() {
  return useSyncExternalStore(
    subscribe,
    () => unlocked.size,
    () => 0
  )
}
