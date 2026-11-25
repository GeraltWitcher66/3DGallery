import { useTexture } from '@react-three/drei'
import { ARTWORKS } from '../data/gallery'
import { artSceneSource } from './artImages'
import { isTouchDevice } from './input'

// Warm the shared three cache for a hall before the visitor gets there, so the
// paintings appear as soon as the proximity trigger fires.
export function preloadHall(hallId) {
  const touch = isTouchDevice()
  const urls = ARTWORKS.filter((art) => art.hall === hallId).map((art) => artSceneSource(art.img, touch))
  if (urls.length) useTexture.preload(urls)
}
