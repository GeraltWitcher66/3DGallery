import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project site from /<repo>/, so the base can be injected
// at build time (BASE_PATH). Local dev and preview keep '/'.
const base = (process.env.BASE_PATH || '/').replace(/\/*$/, '/')

// The 2D view renders before any script runs its fonts, so the Vazirmatn files
// are preloaded from the built HTML. Cormorant belongs to the 3D chunk and is
// deliberately left out.
function preloadVazirmatn() {
  return {
    name: 'preload-vazirmatn',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      const fonts = Object.keys(ctx.bundle || {}).filter((file) =>
        /vazirmatn-(arabic|latin)-(wght|\d+)-normal[^/]*\.woff2$/i.test(file)
      )
      if (!fonts.length) return html
      return {
        html,
        tags: fonts.map((file) => ({
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `${base}${file}` },
          injectTo: 'head',
        })),
      }
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), preloadVazirmatn()],
  server: { port: 5173 },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
      },
      output: {
        manualChunks(id) {
          // React is shared by both views and must stay out of the lazy 3D
          // chunk, or the 2D page would download three to render a grid.
          // Everything three-related stays with the dynamic import instead.
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          if (id.includes('preload-helper')) return 'react'
        },
      },
    },
  },
})
