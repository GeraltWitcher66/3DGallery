import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
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

/* ------------------------------------------------------------------ */
/*  Photoreal test set (CC0 assets from Poly Haven)                    */
/* ------------------------------------------------------------------ */
// Three maps per surface: albedo, roughness and normal. They are fetched only
// once the visitor actually stands in the test hall, so the first paint of the
// lobby never pays for them.
const PHOTOREAL_FILES = [
  '/tex/parquet_diff.webp',
  '/tex/parquet_rough.webp',
  '/tex/parquet_nor.webp',
  '/tex/plaster_diff.webp',
  '/tex/plaster_rough.webp',
  '/tex/plaster_nor.webp',
]

export function usePhotorealTextures(enabled) {
  const [set, setSet] = useState(null)

  useEffect(() => {
    if (!enabled || set) return
    let alive = true
    const loader = new THREE.TextureLoader()
    Promise.all(PHOTOREAL_FILES.map((f) => loader.loadAsync(assetUrl(f))))
      .then((maps) => {
        if (!alive) return
        for (const m of maps) {
          m.wrapS = m.wrapT = THREE.RepeatWrapping
          m.anisotropy = 8
        }
        setSet({ parquet: maps.slice(0, 3), plaster: maps.slice(3, 6) })
      })
      .catch(() => {
        // a failed fetch just leaves the hall on its original materials
      })
    return () => {
      alive = false
    }
  }, [enabled, set])

  return set
}

function tileMap(texture, rx, ry, srgb) {
  const t = texture.clone()
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(rx, ry)
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = 8
  t.needsUpdate = true
  return t
}

/** Clone an albedo/roughness/normal set and give it its own tiling. */
export function useTiledSet(set, rx, ry) {
  return useMemo(() => {
    if (!set) return null
    return {
      map: tileMap(set[0], rx, ry, true),
      roughnessMap: tileMap(set[1], rx, ry, false),
      normalMap: tileMap(set[2], rx, ry, false),
    }
  }, [set, rx, ry])
}

/** A wall material built from the real plaster photos. */
export function usePhotoWallMaterial(set, envMap) {
  return useMemo(() => {
    if (!set) return null
    return new THREE.MeshStandardMaterial({
      // 13m x 3.4m wall: equal-ish repeats keep the plaster grain square
      // instead of stretching it into horizontal streaks.
      map: tileMap(set[0], 10, 2.6, true),
      roughnessMap: tileMap(set[1], 10, 2.6, false),
      normalMap: tileMap(set[2], 10, 2.6, false),
      normalScale: new THREE.Vector2(0.55, 0.55),
      color: '#9e988e',
      roughness: 0.96,
      metalness: 0,
      envMap: envMap || null,
      // The panorama is an 8-bit WebP, so it carries far less radiant power
      // than the HDR it replaced; the multiplier compensates.
      envMapIntensity: 0.85,
    })
  }, [set, envMap])
}

/**
 * PMREM-filtered studio panorama, fetched only while the test hall is open.
 * It ships as a small WebP equirect instead of a multi-megabyte HDR.
 */
export function useStudioEnv(url, enabled = true) {
  const gl = useThree((state) => state.gl)
  const [env, setEnv] = useState(null)

  useEffect(() => {
    if (!enabled || env) return
    let alive = true
    const pmrem = new THREE.PMREMGenerator(gl)
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping
        tex.colorSpace = THREE.SRGBColorSpace
        const target = pmrem.fromEquirectangular(tex)
        tex.dispose()
        if (alive) setEnv(target.texture)
        pmrem.dispose()
      },
      undefined,
      () => pmrem.dispose()
    )
    return () => {
      alive = false
      pmrem.dispose()
    }
  }, [gl, url, enabled, env])

  return env
}

export const PALETTE = {
  cream: '#efe8dc',
  gold: '#c9a96a',
  charcoal: '#16140f',
  wall: '#ffffff',
}
