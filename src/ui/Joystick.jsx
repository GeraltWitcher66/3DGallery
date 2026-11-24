import { useEffect, useRef, useState } from 'react'
import { input } from '../lib/input'

const R = 46

export default function Joystick() {
  const base = useRef(null)
  const knob = useRef(null)
  const active = useRef(false)
  const center = useRef({ x: 0, y: 0 })

  const apply = (e) => {
    let dx = e.clientX - center.current.x
    let dy = e.clientY - center.current.y
    const len = Math.hypot(dx, dy)
    if (len > R) {
      dx = (dx / len) * R
      dy = (dy / len) * R
    }
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`
    input.move.x = dx / R
    input.move.y = -dy / R
  }

  const start = (e) => {
    e.preventDefault()
    active.current = true
    base.current.setPointerCapture?.(e.pointerId)
    const r = base.current.getBoundingClientRect()
    center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    apply(e)
  }

  const move = (e) => {
    if (!active.current) return
    e.preventDefault()
    apply(e)
  }

  const end = (e) => {
    if (!active.current) return
    active.current = false
    input.move.x = 0
    input.move.y = 0
    if (knob.current) knob.current.style.transform = 'translate(0px, 0px)'
  }

  useEffect(() => {
    const clear = () => {
      active.current = false
      input.move.x = 0
      input.move.y = 0
    }
    window.addEventListener('blur', clear)
    return () => window.removeEventListener('blur', clear)
  }, [])

  return (
    <div
      className="joystick"
      ref={base}
      aria-hidden="true"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
    >
      <div className="joystick-ring" />
      <div className="joystick-knob" ref={knob} />
    </div>
  )
}
