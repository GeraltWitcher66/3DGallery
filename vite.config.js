import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project site from /<repo>/, so the base can be injected
// at build time (BASE_PATH). Local dev and preview keep '/'.
const base = (process.env.BASE_PATH || '/').replace(/\/*$/, '/')

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5173 },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) return 'three'
        },
      },
    },
  },
})
