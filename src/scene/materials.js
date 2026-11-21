import { useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { assetUrl } from '../lib/asset'

/** Clone a loaded texture and give it its own tiling. */
export function useTiled(base, rx, ry) {
  return useMemo(() => {
    if (!base) return null
    const t = base.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(rx, ry)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [base, rx, ry])
}

export function useGalleryTextures() {
  const [marble, wood, plaster] = useTexture(
    ['/tex/marble.webp', '/tex/wood.webp', '/tex/plaster.webp'].map(assetUrl)
  )
  return { marble, wood, plaster }
}

export const PALETTE = {
  cream: '#efe8dc',
  gold: '#c9a96a',
  charcoal: '#16140f',
  wall: '#ffffff',
}
