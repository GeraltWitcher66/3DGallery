import variants from '../art-variants.json'
import { assetUrl } from './asset'

// `/art/art-01.webp` → `art-01`, the key used by the generated variant manifest.
const keyOf = (path) =>
  String(path || '')
    .split('/')
    .pop()
    .replace(/\.webp$/i, '')

export function artThumb(path) {
  return assetUrl(`/art/thumb/${keyOf(path)}.webp`)
}

export function artMedium(path) {
  return assetUrl(`/art/med/${keyOf(path)}.webp`)
}

/** Source set for the 2D grid: the thumbnail first, the medium copy for big screens. */
export function artSrcSet(path) {
  const sizes = variants[keyOf(path)]
  const thumb = artThumb(path)
  const medium = artMedium(path)
  if (!sizes) return `${thumb} 480w`
  return `${thumb} ${sizes.thumb}w, ${medium} ${sizes.med}w`
}

/** The 3D scene binds this on phones so the original file is lightbox-only. */
export function artSceneSource(path, touch) {
  return touch ? artMedium(path) : assetUrl(path)
}
