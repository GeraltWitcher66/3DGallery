import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// GitHub Pages serves 404.html for unknown paths. This copy of index.html
// remembers the requested deep link and sends the browser to the app root,
// where main.jsx restores it. Works for root and sub-path deployments.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = (process.env.BASE_PATH || '/').replace(/\/*$/, '/')
const html = readFileSync(resolve(root, 'dist/index.html'), 'utf8')

const redirect = `<script>
  (function () {
    sessionStorage.setItem('spa-redirect', location.pathname + location.search + location.hash);
    location.replace(${JSON.stringify(base)});
  })();
</script>
`

writeFileSync(resolve(root, 'dist/404.html'), html.replace('</head>', `${redirect}</head>`))
writeFileSync(resolve(root, 'dist/.nojekyll'), '')
console.log(`wrote dist/404.html (base ${base})`)
