import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project site from /<repo>/, so the base can be injected
// at build time (BASE_PATH). Local dev and preview keep '/'.
const base = (process.env.BASE_PATH || '/').replace(/\/*$/, '/')

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 1600 },
})
