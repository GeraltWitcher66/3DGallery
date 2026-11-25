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
// Albedo, roughness and normal for the plaster wall. The three WebPs are small
// enough to ship with the scene, since every room is dressed with them.
const PHOTOREAL_FILES = [
  '/tex/plaster_diff.webp',
  '/tex/plaster_rough.webp',
  '/tex/plaster_nor.webp',
]

export function usePhotorealTextures() {
  const [set, setSet] = useState(null)

  useEffect(() => {
    if (set) return
    let alive = true
    const loader = new THREE.TextureLoader()
    Promise.all(PHOTOREAL_FILES.map((f) => loader.loadAsync(assetUrl(f))))
      .then((maps) => {
        if (!alive) return
        for (const m of maps) {
          m.wrapS = m.wrapT = THREE.RepeatWrapping
          m.anisotropy = 8
        }
        setSet({ plaster: maps })
      })
      .catch(() => {
        // a failed fetch just leaves the hall on its original materials
      })
    return () => {
      alive = false
    }
  }, [set])

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

/**
 * A wall material built from the real plaster photos. `detail` drops the normal
 * and roughness maps, which is the last quality step on slow devices.
 */
export function usePhotoWallMaterial(set, envMap, detail = true) {
  return useMemo(() => {
    if (!set) return null
    // 13m x 3.4m wall: equal-ish repeats keep the plaster grain square instead
    // of stretching it into horizontal streaks.
    const props = {
      map: tileMap(set[0], 10, 2.6, true),
      color: '#9e988e',
      roughness: 0.96,
      metalness: 0,
      envMap: envMap || null,
      // The panorama is an 8-bit WebP, so it carries far less radiant power
      // than the HDR it replaced; the multiplier compensates.
      envMapIntensity: 0.85,
    }
    if (detail && set[1] && set[2]) {
      props.roughnessMap = tileMap(set[1], 10, 2.6, false)
      props.normalMap = tileMap(set[2], 10, 2.6, false)
      props.normalScale = new THREE.Vector2(0.55, 0.55)
    }
    return new THREE.MeshStandardMaterial(props)
  }, [set, envMap, detail])
}

/**
 * PMREM-filtered studio panorama used by the wall material. It ships as a
 * small WebP equirect instead of a multi-megabyte HDR.
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
