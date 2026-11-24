import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { HALLS, WALKABLE } from '../data/gallery'
import { input } from '../lib/input'

const EYE = 1.66
// Camera bob is decoration, never information: skip it when the visitor asked
// the system for reduced motion.
const REDUCE_MOTION =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

function canStand(x, z) {
  for (let i = 0; i < WALKABLE.length; i++) {
    const r = WALKABLE[i]
    if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return true
  }
  return false
}

export default function Player({ hallId, enabled, onLockChange }) {
  const { camera, gl } = useThree()
  const yaw = useRef(0)
  const pitch = useRef(0)
  const vel = useRef({ x: 0, z: 0 })
  const bob = useRef(0)
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const lookId = useRef(null)

  // teleport to the hall's spawn point whenever the route changes
  useEffect(() => {
    const s = HALLS[hallId].spawn
    yaw.current = s.yaw
    pitch.current = 0
    vel.current = { x: 0, z: 0 }
    camera.rotation.order = 'YXZ'
    camera.position.set(s.x, EYE, s.z)
    camera.rotation.set(0, s.yaw, 0)
  }, [hallId, camera])

  useEffect(() => {
    camera.rotation.order = 'YXZ'
  }, [camera])

  // keyboard
  useEffect(() => {
    const down = (e) => {
      input.keys.add(e.code)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault()
    }
    const up = (e) => input.keys.delete(e.code)
    const blur = () => input.keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // pointer look + pointer lock
  useEffect(() => {
    const dom = gl.domElement
    const isLocked = () => document.pointerLockElement === dom

    const onLockChange = () => {
      input.locked = isLocked()
      dragging.current = false
      onLockChange?.(input.locked)
    }

    const onPointerDown = (e) => {
      input.dragDistance = 0
      last.current = { x: e.clientX, y: e.clientY }

      if (e.pointerType === 'mouse') {
        dragging.current = true
        if (!isLocked() && !input.hoveringArtwork && enabled) {
          try {
            const p = dom.requestPointerLock?.()
            if (p && typeof p.catch === 'function') p.catch(() => {})
          } catch {
            /* browsers may refuse pointer lock — drag-look still works */
          }
        }
      } else {
        if (lookId.current !== null) return
        lookId.current = e.pointerId
        dragging.current = true
      }
    }

    const onPointerMove = (e) => {
      if (isLocked()) {
        yaw.current -= e.movementX * 0.0022
        pitch.current = clamp(pitch.current - e.movementY * 0.0022, -1.15, 1.15)
        return
      }
      if (!dragging.current) return
      if (e.pointerType !== 'mouse' && e.pointerId !== lookId.current) return
      const dx = e.clientX - last.current.x
      const dy = e.clientY - last.current.y
      last.current = { x: e.clientX, y: e.clientY }
      input.dragDistance += Math.abs(dx) + Math.abs(dy)
      const sens = e.pointerType === 'mouse' ? 0.0032 : 0.0052
      yaw.current -= dx * sens
      pitch.current = clamp(pitch.current - dy * sens, -1.15, 1.15)
    }

    const onPointerUp = (e) => {
      if (e.pointerType === 'mouse') dragging.current = false
      if (e.pointerId === lookId.current) {
        lookId.current = null
        dragging.current = false
      }
    }

    dom.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    document.addEventListener('pointerlockchange', onLockChange)
    return () => {
      dom.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      document.removeEventListener('pointerlockchange', onLockChange)
    }
  }, [gl, enabled, onLockChange])

  useEffect(() => {
    if (!enabled) {
      input.keys.clear()
      input.move.x = 0
      input.move.y = 0
      dragging.current = false
    }
  }, [enabled])

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05)
    const k = input.keys
    const running = k.has('ShiftLeft') || k.has('ShiftRight')
    const speed = running ? 4.1 : 2.35

    let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
    let s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0)
    f += input.move.y
    s += input.move.x
    const len = Math.hypot(f, s)
    if (len > 1) {
      f /= len
      s /= len
    }

    if (!enabled) {
      f = 0
      s = 0
    }

    const sy = Math.sin(yaw.current)
    const cy = Math.cos(yaw.current)
    const dirX = -sy * f + cy * s
    const dirZ = -cy * f - sy * s

    const damp = Math.min(1, step * 11)
    vel.current.x += (dirX * speed - vel.current.x) * damp
    vel.current.z += (dirZ * speed - vel.current.z) * damp

    let nx = camera.position.x + vel.current.x * step
    let nz = camera.position.z + vel.current.z * step
    if (!canStand(nx, nz)) {
      if (canStand(nx, camera.position.z)) {
        nz = camera.position.z
        vel.current.z = 0
      } else if (canStand(camera.position.x, nz)) {
        nx = camera.position.x
        vel.current.x = 0
      } else {
        nx = camera.position.x
        nz = camera.position.z
        vel.current.x = 0
        vel.current.z = 0
      }
    }
    camera.position.x = nx
    camera.position.z = nz

    const moving = Math.hypot(vel.current.x, vel.current.z)
    bob.current += step * moving * 3.6
    camera.position.y =
      EYE + (REDUCE_MOTION ? 0 : Math.sin(bob.current * 2.2) * 0.011 * Math.min(1, moving))

    camera.rotation.x = pitch.current
    camera.rotation.y = yaw.current
    camera.rotation.z = 0
  })

  return null
}
