import '@fontsource-variable/vazirmatn'
import '@fontsource/cormorant-garamond/latin-300.css'
import '@fontsource/cormorant-garamond/latin-400.css'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-300-italic.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './ui/ErrorBoundary.jsx'
import Fatal from './ui/Fatal.jsx'
import './styles.css'

// GitHub Pages has no SPA fallback: 404.html sends deep links here after a
// round trip, so put the original path back before the router reads it.
const forwarded = sessionStorage.getItem('spa-redirect')
if (forwarded) {
  sessionStorage.removeItem('spa-redirect')
  window.history.replaceState({}, '', forwarded)
}

// Canvas labels are painted once, so the local font files have to be ready
// before the scene mounts.
const fontLoads = [
  '300 24px "Vazirmatn Variable"',
  '400 24px "Vazirmatn Variable"',
  '500 24px "Vazirmatn Variable"',
  '300 24px "Cormorant Garamond"',
  '400 24px "Cormorant Garamond"',
  'italic 300 24px "Cormorant Garamond"',
]

const fontsSettled = Promise.allSettled(
  fontLoads.map((font) => (document.fonts ? document.fonts.load(font) : Promise.resolve()))
)

// A missing WebGL context throws deep inside three; check first so the visitor
// gets an explanation instead of a blank page.
function hasWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

fontsSettled.then(() => {
  const root = createRoot(document.getElementById('root'))
  if (!hasWebGL()) {
    root.render(
      <Fatal
        title="مرورگر شما از سه‌بعدی پشتیبانی نمی‌کند"
        detail="برای دیدن گالری، مرورگری با WebGL (نسخهٔ جدید کروم، فایرفاکس یا سافاری) و شتاب گرافیکی روشن را باز کنید."
      />
    )
    return
  }
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
})
