import { useTexture } from '@react-three/drei'
import { ARTWORKS } from '../data/gallery'
import { assetUrl } from './asset'

// Warm the shared three cache for a hall before the visitor gets there, so the
// paintings appear as soon as the proximity trigger fires.
export function preloadHall(hallId) {
  const urls = ARTWORKS.filter((art) => art.hall === hallId).map((art) => assetUrl(art.img))
  if (urls.length) useTexture.preload(urls)
}
