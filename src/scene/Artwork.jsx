import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { input } from '../lib/input'
import { assetUrl } from '../lib/asset'

const LENS_DIAM = 0.34
const LENS_ZOOM = 2.5

function makeLabelTexture(art) {
  const c = document.createElement('canvas')
  c.width = 640
  c.height = 400
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#f4efe4'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.strokeStyle = 'rgba(120,110,92,0.28)'
  ctx.lineWidth = 2
  ctx.strokeRect(4, 4, c.width - 8, c.height - 8)
  ctx.fillStyle = '#b99a5f'
  ctx.fillRect(c.width - 96, 34, 62, 3)

  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#2f2c26'
  ctx.font = '500 40px "Vazirmatn Variable", Tahoma, sans-serif'
  ctx.fillText(art.title, c.width - 44, 116)

  ctx.fillStyle = '#4a463e'
  ctx.font = '300 32px "Vazirmatn Variable", Tahoma, sans-serif'
  ctx.fillText(art.artist, c.width - 44, 176)

  ctx.fillStyle = '#7b7364'
  ctx.font = '300 24px "Vazirmatn Variable", Tahoma, sans-serif'
  ctx.fillText(`${art.year}  ·  ${art.dims}`, c.width - 44, 236)

  ctx.direction = 'ltr'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#9b9282'
  ctx.font = '400 20px "Cormorant Garamond", Georgia, serif'
  ctx.fillText(`No. ${art.id}`, 44, 336)

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export default function Artwork({ art, onOpen }) {
  const tex = useTexture(assetUrl(art.img))
  const { spot } = art
  const w = spot.w
  const h = w / art.aspect

  const lens = useRef()
  const lensTexture = useRef(null)
  const lensMaterial = useRef()
  const [hover, setHover] = useState(false)
  const [gold] = useState(() => Math.abs(art.id.charCodeAt(4) + art.id.charCodeAt(7)) % 2 === 0)

  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    tex.needsUpdate = true
  }, [tex])

  const labelTex = useMemo(() => makeLabelTexture(art), [art])
  useEffect(() => () => labelTex.dispose(), [labelTex])

  const frameColor = gold ? '#9d8556' : '#181512'

  const prepareLens = () => {
    if (!lensTexture.current) {
      const t = tex.clone()
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      t.needsUpdate = true
      lensTexture.current = t
      if (lensMaterial.current) {
        lensMaterial.current.map = t
        lensMaterial.current.needsUpdate = true
      }
    }
    return lensTexture.current
  }

  const moveLens = (uv) => {
    const t = prepareLens()
    const spanX = LENS_DIAM / (LENS_ZOOM * w)
    const spanY = LENS_DIAM / (LENS_ZOOM * h)
    t.repeat.set(spanX, spanY)
    t.offset.set(uv.x - spanX / 2, uv.y - spanY / 2)
    if (lens.current) {
      lens.current.visible = true
      lens.current.position.set((uv.x - 0.5) * w, (uv.y - 0.5) * h, 0.028)
    }
  }

  const nx = Math.sin(spot.rotY)
  const nz = Math.cos(spot.rotY)

  return (
    <group position={[spot.x + nx * 0.176, spot.y, spot.z + nz * 0.176]} rotation-y={spot.rotY}>
      {/* frame */}
      <mesh position={[0, 0, -0.0425]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.14, h + 0.14, 0.085]} />
        <meshPhysicalMaterial
          color={frameColor}
          roughness={gold ? 0.34 : 0.4}
          metalness={gold ? 0.9 : 0.12}
          clearcoat={0.55}
          clearcoatRoughness={0.32}
          envMapIntensity={0.9}
        />
      </mesh>
      {/* inner rabbet */}
      <mesh position={[0, 0, -0.0015]}>
        <planeGeometry args={[w + 0.012, h + 0.012]} />
        <meshStandardMaterial color="#e9e2d2" roughness={0.9} />
      </mesh>

      {/* the painting */}
      <mesh
        position={[0, 0, 0.004]}
        castShadow={false}
        onPointerOver={(e) => {
          e.stopPropagation()
          input.hoveringArtwork = true
          setHover(true)
          document.body.style.cursor = 'zoom-in'
          moveLens(e.uv)
        }}
        onPointerMove={(e) => {
          e.stopPropagation()
          moveLens(e.uv)
        }}
        onPointerOut={() => {
          input.hoveringArtwork = false
          setHover(false)
          document.body.style.cursor = ''
          if (lens.current) lens.current.visible = false
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (input.dragDistance < 9) onOpen()
        }}
      >
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={0.58} metalness={0} envMapIntensity={0.08} />
      </mesh>

      {/* circular magnifier, no handle */}
      <group ref={lens} visible={false} position={[0, 0, 0.028]}>
        <mesh position={[0, 0, 0.002]}>
          <circleGeometry args={[LENS_DIAM / 2, 64]} />
          <meshBasicMaterial ref={lensMaterial} toneMapped />
        </mesh>
        <mesh position={[0, 0, 0.004]}>
          <ringGeometry args={[LENS_DIAM / 2, LENS_DIAM / 2 + 0.0075, 72]} />
          <meshStandardMaterial color="#e6dcc4" roughness={0.28} metalness={0.75} envMapIntensity={1.1} />
        </mesh>
        <mesh position={[0, 0, -0.001]}>
          <circleGeometry args={[LENS_DIAM / 2 + 0.02, 48]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.16} />
        </mesh>
      </group>

      {/* wall label */}
      <mesh position={[w / 2 + 0.145, 1.06 - spot.y, 0.0]}>
        <planeGeometry args={[0.21, 0.132]} />
        <meshBasicMaterial map={labelTex} toneMapped={false} />
      </mesh>

      {hover && (
        <pointLight position={[0, h / 2 + 0.25, 0.9]} intensity={0.6} distance={2.4} decay={2} color="#fff4e4" />
      )}
    </group>
  )
}
