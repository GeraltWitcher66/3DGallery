import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useProgress } from '@react-three/drei'
import Gallery from './scene/Gallery'
import Player from './scene/Player'
import { ARTWORKS, HALLS } from './data/gallery'
import { useRoute } from './lib/router'
import { isTouchDevice } from './lib/input'
import { unlockHall } from './lib/hallTextures'
import { useDocumentMeta } from './lib/useDocumentMeta'
import { assetUrl } from './lib/asset'
import Hud from './ui/Hud'
import Intro from './ui/Intro'
import Lightbox from './ui/Lightbox'
import Help from './ui/Help'
import ArtworkIndex from './ui/ArtworkIndex'
import Joystick from './ui/Joystick'
import OrientationHint from './ui/OrientationHint'
import LoadingOverlay from './ui/LoadingOverlay'
import Fatal from './ui/Fatal'

// The full-screen loader sits above the canvas, so the scene fallback only has
// to keep the clear color on brand instead of flashing a light frame.
function SceneFallback() {
  return <color attach="background" args={['#0d0d0c']} />
}

const LIGHTBOX_HINT = 'برای جابه‌جایی میان آثار از کلیدهای جهت‌دار استفاده کنید.'

export default function App() {
  const [route, nav] = useRoute()
  const hallId = route.hall
  const [introOpen, setIntroOpen] = useState(() => !route.art)
  const [helpOpen, setHelpOpen] = useState(false)
  const [indexOpen, setIndexOpen] = useState(false)
  const [locked, setLocked] = useState(false)
  const [touch, setTouch] = useState(false)
  const [hint, setHint] = useState(false)
  const [contextLost, setContextLost] = useState(false)
  const { progress, active, total } = useProgress()
  const loaded = total > 0 && progress >= 100 && !active
  // Later halls load in the background as the visitor walks, so readiness is
  // latched: the entry gate must not close again once the first hall is ready.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (loaded) setReady(true)
  }, [loaded])

  useEffect(() => {
    unlockHall(hallId)
  }, [hallId])

  useEffect(() => {
    setTouch(isTouchDevice())
  }, [])

  const hall = HALLS[hallId]

  // The lightbox is driven by the route, so every artwork has its own URL and
  // browser back/forward keeps working.
  const selected = useMemo(
    () => (route.art ? ARTWORKS.find((item) => item.id === route.art) || null : null),
    [route.art]
  )

  const siblings = useMemo(
    () => (selected ? ARTWORKS.filter((art) => art.hall === selected.hall) : []),
    [selected]
  )
  const position = selected ? siblings.findIndex((art) => art.id === selected.id) : -1
  const prevArt = position > 0 ? siblings[position - 1] : null
  const nextArt = position >= 0 && position < siblings.length - 1 ? siblings[position + 1] : null

  useDocumentMeta({
    title: selected
      ? `${selected.title} — ${selected.artist}`
      : hall.id === 'lobby'
        ? null
        : `${hall.name} — ${hall.tagline}`,
    description: selected
      ? `${selected.title}، ${selected.artist} (${selected.year}). ${selected.medium}. ${selected.dims}. ${LIGHTBOX_HINT}`
      : hall.id === 'lobby'
        ? 'گالری آریانا — گالری هنری مجازی سه‌بعدی؛ سالن اصلی و پنج سالن نمایشگاهی با بیست‌ویک اثر از هنرمندان معاصر ایران.'
        : `${hall.name} — ${hall.tagline} · ${hall.en}. گالری آریانا، گالری هنری مجازی سه‌بعدی.`,
    image: selected ? window.location.origin + assetUrl(selected.img) : undefined,
  })

  const goHall = useCallback(
    (id) => {
      if (document.pointerLockElement) document.exitPointerLock()
      setIntroOpen(false)
      setIndexOpen(false)
      nav.goHall(id)
    },
    [nav]
  )

  const openArtwork = useCallback(
    (art) => {
      if (document.pointerLockElement) document.exitPointerLock()
      setIntroOpen(false)
      setIndexOpen(false)
      nav.goArtwork(art)
    },
    [nav]
  )

  const closeArtwork = useCallback(() => {
    nav.closeArtwork()
  }, [nav])

  const openHelp = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock()
    setHelpOpen(true)
  }, [])

  const openIndex = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock()
    setIndexOpen(true)
  }, [])

  const enter = useCallback(() => {
    setIntroOpen(false)
  }, [])

  useEffect(() => {
    if (introOpen || selected || helpOpen || indexOpen) {
      setHint(false)
      return
    }
    setHint(true)
    const t = setTimeout(() => setHint(false), 8000)
    return () => clearTimeout(t)
  }, [introOpen, selected, helpOpen, indexOpen, locked, hallId])

  const busy = introOpen || selected || helpOpen || indexOpen

  return (
    <div className="app">
      <div className="scene" aria-hidden="true">
        <Canvas
          shadows
          dpr={touch ? [1, 1.5] : [1, 1.75]}
          camera={{ fov: touch ? 72 : 62, near: 0.05, far: 140, position: [0, 1.66, 12.4] }}
          gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.12
            gl.shadowMap.type = THREE.PCFSoftShadowMap
            // The scene is static: shadows are rendered on demand (see
            // StaticShadows) instead of every frame.
            gl.shadowMap.autoUpdate = false
            gl.shadowMap.needsUpdate = true
            gl.domElement.addEventListener('webglcontextlost', (event) => {
              event.preventDefault()
              setContextLost(true)
            })
          }}
        >
          <color attach="background" args={['#0a0908']} />
          <Suspense fallback={<SceneFallback />}>
            <Gallery activeHall={hallId} artworks={ARTWORKS} onOpenArtwork={openArtwork} />
          </Suspense>
          <Player hallId={hallId} enabled={!busy} onLockChange={setLocked} />
        </Canvas>
      </div>

      <div className="vignette" aria-hidden="true" />

      {!introOpen && (
        <Hud
          hall={hall}
          onNavigate={goHall}
          isTouch={touch}
          locked={locked}
          showHint={hint}
          onHelp={openHelp}
          onIndex={openIndex}
          onHome={() => goHall('lobby')}
        />
      )}

      {touch && !busy && <Joystick />}

      <OrientationHint active={touch && !introOpen} />

      {selected && (
        <Lightbox
          art={selected}
          onClose={closeArtwork}
          prevArt={prevArt}
          nextArt={nextArt}
          onPrev={prevArt ? () => nav.goArtwork(prevArt) : null}
          onNext={nextArt ? () => nav.goArtwork(nextArt) : null}
        />
      )}

      {helpOpen && <Help onClose={() => setHelpOpen(false)} />}

      {indexOpen && <ArtworkIndex onOpen={openArtwork} onClose={() => setIndexOpen(false)} />}

      {introOpen && <Intro onEnter={enter} onNavigate={goHall} progress={progress} ready={ready} />}

      <LoadingOverlay ready={ready} />

      {contextLost && (
        <Fatal
          title="اتصال گرافیکی قطع شد"
          detail="پردازش سه‌بعدی در این نشست متوقف شد. صفحه را دوباره بارگذاری کنید."
          onRetry={() => window.location.reload()}
        />
      )}
    </div>
  )
}
