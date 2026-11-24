import { useEffect, useRef, useSyncExternalStore } from 'react'
import { artworkHover, pointer } from '../lib/input'

// A small brass badge that the visitor can read at a glance: it appears at the
// pointer whenever it rests on a painting, so the work is obviously clickable.
export default function ArtworkCursor() {
  const active = useSyncExternalStore(artworkHover.subscribe, artworkHover.get, artworkHover.get)
  const ref = useRef(null)

  useEffect(() => {
    const place = () => {
      const el = ref.current
      if (el) el.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`
    }
    const move = (e) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      place()
    }
    place()
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  return (
    <div ref={ref} className={active ? 'art-cursor is-on' : 'art-cursor'} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H3v6" />
        <path d="M15 3h6v6" />
        <path d="M21 15v6h-6" />
        <path d="M3 15v6h6" />
      </svg>
    </div>
  )
}
