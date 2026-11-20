import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// GitHub Pages has no SPA fallback: 404.html sends deep links here after a
// round trip, so put the original path back before the router reads it.
const forwarded = sessionStorage.getItem('spa-redirect')
if (forwarded) {
  sessionStorage.removeItem('spa-redirect')
  window.history.replaceState({}, '', forwarded)
}

createRoot(document.getElementById('root')).render(<App />)
