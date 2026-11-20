import { useEffect, useRef, useState } from 'react'
import { HALLS } from '../data/gallery'
import { formatPrice } from '../lib/format'
import { assetUrl } from '../lib/asset'

const MIN = 1
const MAX = 6
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

export default function Lightbox({ art, onClose }) {
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [smooth, setSmooth] = useState(true)
  const stageRef = useRef(null)
  const pointers = useRef(new Map())
  const drag = useRef(null)
  const pinch = useRef(null)

  const hall = HALLS[art.hall]

  useEffect(() => {
    setScale(1)
    setPos({ x: 0, y: 0 })
    setSmooth(true)
  }, [art.id])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') setScale((s) => clamp(s * 1.3, MIN, MAX))
      if (e.key === '-') setScale((s) => clamp(s / 1.3, MIN, MAX))
      if (e.key === '0') {
        setScale(1)
        setPos({ x: 0, y: 0 })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const factor = Math.exp(-e.deltaY * 0.0016)
      setScale((s) => clamp(s * factor, MIN, MAX))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    if (scale <= 1.001 && (pos.x !== 0 || pos.y !== 0)) setPos({ x: 0, y: 0 })
  }, [scale, pos.x, pos.y])

  const zoom = (f) => {
    setSmooth(true)
    setScale((s) => clamp(s * f, MIN, MAX))
  }

  const reset = () => {
    setSmooth(true)
    setScale(1)
    setPos({ x: 0, y: 0 })
  }

  const clampPos = (x, y, sc) => {
    const el = stageRef.current
    if (!el) return { x, y }
    const r = el.getBoundingClientRect()
    const maxX = (r.width * (sc - 1)) / 2
    const maxY = (r.height * (sc - 1)) / 2
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) }
  }

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), startScale: scale }
      drag.current = null
      return
    }
    if (scale <= 1.001) return
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
    setSmooth(false)
  }

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      setScale(clamp((pinch.current.startScale * dist) / pinch.current.dist, MIN, MAX))
      return
    }
    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    setPos(clampPos(drag.current.px + dx, drag.current.py + dy, scale))
  }

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) {
      drag.current = null
      setSmooth(true)
    }
  }

  const toggleZoom = () => {
    setSmooth(true)
    if (scale > 1.05) reset()
    else setScale(2.4)
  }

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${art.title}، ${art.artist}`}>
      <div className="lb-backdrop" onClick={onClose} />
      <div className="lb-panel">
        <div
          className="lb-stage"
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={toggleZoom}
        >
          <img
            className="lb-img"
            src={assetUrl(art.img)}
            alt={`${art.title} — ${art.artist}`}
            draggable={false}
            style={{
              transform: `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${scale})`,
              transition: smooth ? 'transform .3s cubic-bezier(.22,.61,.36,1)' : 'none',
              cursor: scale > 1.05 ? 'grab' : 'zoom-in',
            }}
          />
          <div className="lb-stage-caption">
            {scale > 1.05 ? 'برای جابه‌جایی بکشید' : 'برای بزرگ‌نمایی اسکرول کنید یا دوبار ضربه بزنید'}
          </div>
          <div className="zoom-controls" onPointerDown={(e) => e.stopPropagation()}>
            <button onClick={() => zoom(1.3)} aria-label="بزرگ‌نمایی">+</button>
            <button onClick={() => zoom(1 / 1.3)} aria-label="کوچک‌نمایی">−</button>
            <button onClick={reset} aria-label="بازنشانی" className="reset">↺</button>
          </div>
        </div>

        <aside className="lb-info">
          <p className="lb-eyebrow">
            {hall.name} <span>·</span> {hall.tagline}
          </p>
          <h2 className="lb-title">{art.title}</h2>
          <p className="lb-artist">{art.artist}</p>
          <div className="lb-rule" />

          <dl className="lb-meta">
            <div>
              <dt>سال خلق</dt>
              <dd>{art.year}</dd>
            </div>
            <div>
              <dt>تکنیک و متریال</dt>
              <dd>{art.medium}</dd>
            </div>
            <div>
              <dt>ابعاد</dt>
              <dd>{art.dims}</dd>
            </div>
            <div>
              <dt>شمارهٔ شناسایی</dt>
              <dd className="mono">{art.id}</dd>
            </div>
          </dl>

          <div className="lb-price">
            <span>قیمت</span>
            <strong>{formatPrice(art.price)}</strong>
            <em>تومان</em>
          </div>

          <div className="lb-desc">
            <h3>دربارهٔ اثر</h3>
            <p>{art.desc}</p>
          </div>

          <p className="lb-note">گالری آریانا · تهران، خیابان فرشته</p>
        </aside>
      </div>

      <button className="lb-close" onClick={onClose} aria-label="بستن">
        <span>×</span>
      </button>
    </div>
  )
}
