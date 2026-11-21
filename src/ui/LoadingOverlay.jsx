import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { faNum } from '../lib/format'

export default function LoadingOverlay({ ready }) {
  const { progress } = useProgress()
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => setGone(true), 650)
    return () => clearTimeout(t)
  }, [ready])

  if (gone) return null

  const pct = Math.max(0, Math.min(100, Math.round(progress)))

  return (
    <div className={`preloader${ready ? ' is-fading' : ''}`} role="status" aria-live="polite">
      <div className="preloader-inner">
        <span className="preloader-est latin">ARIANA CONTEMPORARY GALLERY</span>
        <h2 className="preloader-title">گالری آریانا</h2>
        <div className="preloader-bar">
          <span style={{ width: `${pct}%` }} />
        </div>
        <span className="preloader-pct">{faNum(pct)}٪</span>
      </div>
    </div>
  )
}
