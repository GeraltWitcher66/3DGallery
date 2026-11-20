import { Suspense, useCallback, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useProgress } from '@react-three/drei'
import Gallery from './scene/Gallery'
import Player from './scene/Player'
import { ARTWORKS, HALLS } from './data/gallery'
import { useHallRoute } from './lib/router'
import { isTouchDevice } from './lib/input'
import Hud from './ui/Hud'
import Intro from './ui/Intro'
import Lightbox from './ui/Lightbox'
import Help from './ui/Help'
import Joystick from './ui/Joystick'

export default function App() {
  const [hallId, navigate] = useHallRoute()
  const [selected, setSelected] = useState(null)
  const [introOpen, setIntroOpen] = useState(true)
  const [helpOpen, setHelpOpen] = useState(false)
  const [locked, setLocked] = useState(false)
  const [touch, setTouch] = useState(false)
  const [hint, setHint] = useState(false)
  const { progress } = useProgress()

  useEffect(() => {
    setTouch(isTouchDevice())
  }, [])

  const hall = HALLS[hallId]

  const goHall = useCallback(
    (id) => {
      if (document.pointerLockElement) document.exitPointerLock()
      setSelected(null)
      setIntroOpen(false)
      navigate(id)
    },
    [navigate]
  )

  const openArtwork = useCallback((art) => {
    if (document.pointerLockElement) document.exitPointerLock()
    setSelected(art)
  }, [])

  const closeArtwork = useCallback(() => setSelected(null), [])

  const enter = useCallback(() => {
    setIntroOpen(false)
  }, [])

  useEffect(() => {
    if (introOpen || selected || helpOpen) {
      setHint(false)
      return
    }
    setHint(true)
    const t = setTimeout(() => setHint(false), 8000)
    return () => clearTimeout(t)
  }, [introOpen, selected, helpOpen, locked, hallId])

  return (
    <div className="app">
      <div className="scene">
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ fov: touch ? 72 : 62, near: 0.05, far: 140, position: [0, 1.66, 12.4] }}
          gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.12
            gl.shadowMap.type = THREE.PCFSoftShadowMap
          }}
        >
          <color attach="background" args={['#0a0908']} />
          <Suspense fallback={null}>
            <Gallery activeHall={hallId} artworks={ARTWORKS} onOpenArtwork={openArtwork} />
          </Suspense>
          <Player
            hallId={hallId}
            enabled={!introOpen && !selected && !helpOpen}
            onLockChange={setLocked}
          />
        </Canvas>
      </div>

      <div className="vignette" />

      {!introOpen && (
        <Hud
          hall={hall}
          onNavigate={goHall}
          isTouch={touch}
          locked={locked}
          showHint={hint}
          onHelp={() => {
            if (document.pointerLockElement) document.exitPointerLock()
            setHelpOpen(true)
          }}
          onHome={() => goHall('lobby')}
        />
      )}

      {touch && !introOpen && !selected && !helpOpen && <Joystick />}

      {progress < 100 && !introOpen && (
        <div className="scene-loader">
          <span>در حال آماده‌سازی فضا…</span>
        </div>
      )}

      {selected && <Lightbox art={selected} onClose={closeArtwork} />}

      {helpOpen && <Help onClose={() => setHelpOpen(false)} />}

      {introOpen && <Intro onEnter={enter} onNavigate={goHall} progress={progress} />}
    </div>
  )
}
