import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { artworkHover, input, isTouchDevice } from '../lib/input'
import { artSceneSource } from '../lib/artImages'

// Soft dark halo behind the frame: a cheap stand-in for the ambient occlusion a
// real gallery wall gets around a heavy frame. Built once for all 21 works.
let haloTexture = null
function getHaloTexture() {
  if (haloTexture) return haloTexture
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 62)
  g.addColorStop(0, 'rgba(0,0,0,0.5)')
  g.addColorStop(0.6, 'rgba(0,0,0,0.24)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  haloTexture = new THREE.CanvasTexture(c)
  return haloTexture
}

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
  // Phones bind the medium copy; the full-size file is only fetched by the
  // lightbox.
  const tex = useTexture(artSceneSource(art.img, isTouchDevice()))
  const { spot } = art
  const w = spot.w
  const h = w / art.aspect

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

  const nx = Math.sin(spot.rotY)
  const nz = Math.cos(spot.rotY)

  return (
    <group position={[spot.x + nx * 0.176, spot.y, spot.z + nz * 0.176]} rotation-y={spot.rotY}>
      {/* wall contact */}
      <mesh position={[0, 0, -0.044]} renderOrder={-1}>
        <planeGeometry args={[w + 0.62, h + 0.62]} />
        <meshBasicMaterial map={getHaloTexture()} transparent depthWrite={false} toneMapped={false} />
      </mesh>
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
          artworkHover.set(true)
          setHover(true)
        }}
        onPointerMove={(e) => {
          e.stopPropagation()
        }}
        onPointerOut={() => {
          artworkHover.set(false)
          setHover(false)
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (input.dragDistance < 9) onOpen()
        }}
      >
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={0.58} metalness={0} envMapIntensity={0.08} />
      </mesh>

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
