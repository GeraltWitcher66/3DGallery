import '@fontsource/cormorant-garamond/latin-300.css'
import '@fontsource/cormorant-garamond/latin-400.css'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-300-italic.css'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PerformanceMonitor, useProgress } from '@react-three/drei'
import Gallery from './scene/Gallery'
import Player from './scene/Player'
import { ARTWORKS, HALLS } from './data/gallery'
import { useRoute } from './lib/router'
import { isTouchDevice } from './lib/input'
import { unlockHall } from './lib/hallTextures'
import { useDocumentMeta } from './lib/useDocumentMeta'
import { assetUrl } from './lib/asset'
import { MAX_STEP, currentStep, quality } from './lib/quality'
import Hud from './ui/Hud'
import Intro from './ui/Intro'
import Lightbox from './ui/Lightbox'
import Help from './ui/Help'
import ArtworkIndex from './ui/ArtworkIndex'
import Joystick from './ui/Joystick'
import OrientationHint from './ui/OrientationHint'
import ArtworkCursor from './ui/ArtworkCursor'
import LoadingOverlay from './ui/LoadingOverlay'

// The full-screen loader sits above the canvas, so the scene fallback only has
// to keep the clear color on brand instead of flashing a light frame.
function SceneFallback() {
  return <color attach="background" args={['#0d0d0c']} />
}

const LIGHTBOX_HINT = 'برای جابه‌جایی میان آثار از کلیدهای جهت‌دار استفاده کنید.'

// Canvas labels are painted once, so the local font files have to be ready
// before the scene mounts.
const FONT_LOADS = [
  '300 24px "Vazirmatn Variable"',
  '400 24px "Vazirmatn Variable"',
  '500 24px "Vazirmatn Variable"',
  '300 24px "Cormorant Garamond"',
  '400 24px "Cormorant Garamond"',
  'italic 300 24px "Cormorant Garamond"',
]

function useFontsReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    const loads = document.fonts ? FONT_LOADS.map((font) => document.fonts.load(font)) : []
    Promise.allSettled(loads).then(() => {
      if (alive) setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])
  return ready
}

// The Canvas `shadows` prop is applied on creation; this keeps the shadow map
// in step when the quality ladder turns it off later.
function ShadowSettings({ enabled }) {
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    gl.shadowMap.enabled = enabled
    if (enabled) gl.shadowMap.needsUpdate = true
  }, [gl, enabled])
  return null
}

export default function App({ onExit }) {
  const [route, nav] = useRoute()
  const hallId = route.hall
  const [introOpen, setIntroOpen] = useState(() => !route.art)
  const [helpOpen, setHelpOpen] = useState(false)
  const [indexOpen, setIndexOpen] = useState(false)
  const [locked, setLocked] = useState(false)
  const [touch, setTouch] = useState(false)
  const [hint, setHint] = useState(false)
  const [slowScene, setSlowScene] = useState(false)
  const { progress, active, total } = useProgress()
  const loaded = total > 0 && progress >= 100 && !active
  // Later halls load in the background as the visitor walks, so readiness is
  // latched: the entry gate must not close again once the first hall is ready.
  const [ready, setReady] = useState(false)
  const fontsReady = useFontsReady()

  const qualityMode = useSyncExternalStore(quality.subscribe, quality.getMode, quality.getMode)
  const autoLevel = useSyncExternalStore(quality.subscribe, quality.getLevel, quality.getLevel)
  const step = currentStep({ touch, mode: qualityMode, level: autoLevel })

  // One quality change at a time: a drop followed a moment later by a raise
  // reads as flicker on screen.
  const lastChange = useRef(0)
  const adjustQuality = useCallback(
    (delta) => {
      const now = Date.now()
      if (now - lastChange.current < 4000) return
      const next = autoLevel + delta
      if (next > MAX_STEP) {
        if (delta > 0) setSlowScene(true)
        return
      }
      if (next < 0 || next === autoLevel) return
      lastChange.current = now
      setSlowScene(false)
      quality.setLevel(next)
    },
    [autoLevel]
  )

  useEffect(() => {
    if (qualityMode !== 'auto' || autoLevel < MAX_STEP) setSlowScene(false)
  }, [qualityMode, autoLevel])

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

  const leaveScene = useCallback(
    (reason) => {
      if (document.pointerLockElement) document.exitPointerLock()
      onExit?.(reason)
    },
    [onExit]
  )

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

  if (!fontsReady) {
    return (
      <div className="scene-boot" role="status">
        در حال آماده‌سازی نمای سه‌بعدی…
      </div>
    )
  }

  return (
    <div className="app">
      <div className="scene" aria-hidden="true">
        <Canvas
          shadows={step.shadows}
          dpr={[1, step.dpr]}
          camera={{ fov: touch ? 72 : 62, near: 0.05, far: 140, position: [0, 1.66, 12.4] }}
          gl={{ antialias: !touch, powerPreference: 'high-performance', stencil: false }}
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
              leaveScene('context')
            })
          }}
        >
          <color attach="background" args={['#0a0908']} />
          <ShadowSettings enabled={step.shadows} />
          {qualityMode === 'auto' && (
            <PerformanceMonitor
              ms={1400}
              iterations={4}
              onDecline={() => adjustQuality(1)}
              onIncline={() => adjustQuality(-1)}
            />
          )}
          <Suspense fallback={<SceneFallback />}>
            <Gallery
              activeHall={hallId}
              artworks={ARTWORKS}
              onOpenArtwork={openArtwork}
              detail={step.maps}
            />
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
          onSimple={() => leaveScene()}
        />
      )}

      {touch && !busy && <Joystick />}

      {!touch && !busy && <ArtworkCursor />}

      <OrientationHint active={touch && !introOpen} />

      {slowScene && (
        <div className="perf-hint" role="status">
          <p>کیفیت نمایش به کمترین سطح رسید و هنوز کند است.</p>
          <button className="btn-gold" onClick={() => leaveScene()}>
            نمای ساده
          </button>
          <button className="perf-hint-close" onClick={() => setSlowScene(false)} aria-label="بستن">
            ×
          </button>
        </div>
      )}

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

      {introOpen && (
        <Intro
          onEnter={enter}
          onNavigate={goHall}
          progress={progress}
          ready={ready}
          onSimple={() => leaveScene()}
        />
      )}

      <LoadingOverlay ready={ready} />
    </div>
  )
}
