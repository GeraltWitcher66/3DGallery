import '@fontsource-variable/vazirmatn'
import React, { Suspense, lazy, useEffect, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './simple.css'
import SimpleApp from './simple/SimpleApp.jsx'
import ErrorBoundary from './ui/ErrorBoundary.jsx'
import { loadScene3D } from './lib/sceneLoader.js'
import { viewMode } from './lib/viewMode.js'

// The 3D bundle is a separate chunk: this entry never imports three.
const SceneApp = lazy(loadScene3D)

// GitHub Pages has no SPA fallback: 404.html sends deep links here after a
// round trip, so put the original path back before the router reads it.
const forwarded = sessionStorage.getItem('spa-redirect')
if (forwarded) {
  sessionStorage.removeItem('spa-redirect')
  window.history.replaceState({}, '', forwarded)
}

// A missing WebGL context throws deep inside three; check first so the visitor
// lands on the 2D tour instead of a blank page.
function hasWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

if (viewMode.get() === 'scene' && !hasWebGL()) {
  viewMode.set('simple', 'webgl')
}

function SceneBoot() {
  return (
    <div className="scene-boot" role="status">
      <p>در حال آماده‌سازی نمای سه‌بعدی…</p>
      <button onClick={() => viewMode.set('simple')}>نمای ساده</button>
    </div>
  )
}

function Root() {
  const mode = useSyncExternalStore(viewMode.subscribe, viewMode.get, viewMode.get)
  const note = useSyncExternalStore(viewMode.subscribe, viewMode.getNote, () => '')

  useEffect(() => {
    document.body.classList.toggle('is-simple', mode !== 'scene')
  }, [mode])

  if (mode !== 'scene') return <SimpleApp note={note} />

  return (
    <Suspense fallback={<SceneBoot />}>
      <ErrorBoundary onError={() => viewMode.set('simple', 'error')}>
        <SceneApp onExit={() => viewMode.set('simple')} />
      </ErrorBoundary>
    </Suspense>
  )
}

// Static pages prerender real content inside #root; drop it so React owns the
// element instead of sitting next to a duplicate copy of the page.
const container = document.getElementById('root')
container.replaceChildren()
createRoot(container).render(<Root />)
