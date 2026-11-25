import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Two smaller WebP copies of every painting: a 480px thumbnail for the grid and
// a 1024px medium copy for phones in the 3D scene. The original stays untouched
// and is only fetched by the lightbox.
//
// Node has no image codec of its own, so the resize runs through whatever is
// already on the machine (sharp when the project has it, Python/Pillow
// otherwise). The generated files are committed, so a build never depends on
// either being installed.

const THUMB_WIDTH = 480
const MEDIUM_WIDTH = 1024
const QUALITY = 82

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const artDir = join(root, 'public', 'art')
const manifestPath = join(root, 'src', 'art-variants.json')

const PILLOW = `
import sys
from PIL import Image
src, out, target = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src)
im = im.convert('RGB')
w, h = im.size
if w > target:
    h = round(h * target / w)
    w = target
    im = im.resize((w, h), Image.LANCZOS)
im.save(out, 'WEBP', quality=int(sys.argv[4]), method=6)
print(w)
`

function hasSharp() {
  try {
    return Boolean(execFileSync(process.execPath, ['-e', "require.resolve('sharp')"], { stdio: 'pipe' }))
  } catch {
    return false
  }
}

let sharp = null
if (hasSharp()) {
  ;({ default: sharp } = await import('sharp'))
}

async function resize(src, out, width) {
  if (sharp) {
    const meta = await sharp(src).metadata()
    const target = meta.width > width ? width : meta.width
    await sharp(src).resize({ width: target }).webp({ quality: QUALITY, effort: 6 }).toFile(out)
    return target
  }
  const printed = execFileSync('python', ['-c', PILLOW, src, out, String(width), String(QUALITY)], {
    encoding: 'utf8',
  })
  return Number(printed.trim())
}

const files = readdirSync(artDir)
  .filter((name) => /\.webp$/i.test(name) && statSync(join(artDir, name)).isFile())
  .sort()

if (!files.length) {
  console.error('make-art-variants: no .webp files in public/art')
  process.exit(1)
}

const thumbs = join(artDir, 'thumb')
const mediums = join(artDir, 'med')
for (const dir of [thumbs, mediums]) if (!existsSync(dir)) mkdirSync(dir)

const manifest = {}
for (const name of files) {
  const src = join(artDir, name)
  const key = name.replace(/\.webp$/i, '')
  const thumbWidth = await resize(src, join(thumbs, name), THUMB_WIDTH)
  const mediumWidth = await resize(src, join(mediums, name), MEDIUM_WIDTH)
  manifest[key] = { thumb: thumbWidth, med: mediumWidth }
  console.log(`${name}: thumb ${thumbWidth}px, med ${mediumWidth}px`)
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`wrote ${Object.keys(manifest).length} variants + src/art-variants.json`)
