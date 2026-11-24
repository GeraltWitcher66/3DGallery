import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { ENTRY_DEPTH, HALLS, HALL_ORDER, VESTIBULE } from '../data/gallery'
import {
  useGalleryTextures,
  useTiled,
  usePhotoWallMaterial,
  usePhotorealTextures,
  useStudioEnv,
} from './materials'
import { assetUrl } from '../lib/asset'
import { useHallUnlocked, useUnlockVersion } from '../lib/hallTextures'
import Artwork from './Artwork'

const T = 0.26 // wall thickness

// Coarse pointers get cheaper shadow maps; the scene is static so the sun map
// only has to look good, not update every frame.
const COARSE_POINTER = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
const SUN_SHADOW_SIZE = COARSE_POINTER ? 1024 : 2048
const SPOT_SHADOW_SIZE = COARSE_POINTER ? 512 : 1024

// Every room is dressed with the CC0 plaster photos; this hall also keeps the
// neutral test lighting it was tuned against.
const PHOTOREAL_HALL = 'hall-1'

/* ------------------------------------------------------------------ */
/*  Environment                                                        */
/* ------------------------------------------------------------------ */
function StudioEnvironment() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

/* ------------------------------------------------------------------ */
/*  Wall builder                                                       */
/* ------------------------------------------------------------------ */
function WallRun({ axis, fixed, from, to, height, gaps = [], material, y0 = 0 }) {
  const boxes = useMemo(() => {
    const out = []
    const sorted = [...gaps].sort((a, b) => a.start - b.start)
    let cursor = from
    for (const g of sorted) {
      const start = Math.max(from, g.start)
      const end = Math.min(to, g.end)
      if (start > cursor) out.push({ a: cursor, b: start, y: 0, h: height })
      if (g.top < height) out.push({ a: start, b: end, y: g.top, h: height - g.top })
      cursor = Math.max(cursor, end)
    }
    if (cursor < to) out.push({ a: cursor, b: to, y: 0, h: height })
    return out
  }, [from, to, height, gaps])

  return (
    <group>
      {boxes.map((s, i) => {
        const len = s.b - s.a
        if (len <= 0.01 || s.h <= 0.01) return null
        const cx = axis === 'x' ? (s.a + s.b) / 2 : fixed
        const cz = axis === 'x' ? fixed : (s.a + s.b) / 2
        return (
          <mesh
            key={i}
            position={[cx, y0 + s.y + s.h / 2, cz]}
            castShadow
            receiveShadow
            material={material}
          >
            <boxGeometry args={axis === 'x' ? [len, s.h, T] : [T, s.h, len]} />
          </mesh>
        )
      })}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Floors                                                             */
/* ------------------------------------------------------------------ */
function Floor({ x0, x1, z0, z1, kind, marble, wood }) {
  const w = x1 - x0
  const d = z1 - z0
  const marbleMap = useTiled(marble, w / 3.1, d / 3.1)
  const woodMap = useTiled(wood, w / 1.35, d / 1.35)
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]}
      receiveShadow
    >
      <planeGeometry args={[w, d]} />
      {kind === 'marble' ? (
        <meshPhysicalMaterial
          map={marbleMap}
          color="#cec6b6"
          roughness={0.1}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.06}
          envMapIntensity={0.95}
        />
      ) : (
        <meshPhysicalMaterial
          map={woodMap}
          color="#a98256"
          roughness={0.34}
          metalness={0}
          clearcoat={0.6}
          clearcoatRoughness={0.3}
          envMapIntensity={0.6}
        />
      )}
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/*  Ceiling + light coves                                             */
/* ------------------------------------------------------------------ */
function CeilingPanel({ x0, x1, z0, z1, y, color = '#2b2723' }) {
  return (
    <mesh rotation-x={Math.PI / 2} position={[(x0 + x1) / 2, y, (z0 + z1) / 2]}>
      <planeGeometry args={[x1 - x0, z1 - z0]} />
      <meshStandardMaterial
        color={color}
        emissive="#221d18"
        emissiveIntensity={0.55}
        roughness={0.95}
        metalness={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Glazed roof: a bright pane raised above the ceiling opening, held by a grid
// of metal mullions. The lobby and every hall share it.
function Skylight({ x0, x1, z0, z1, y, glow = 0.45, cols = 3, rows = 3 }) {
  const w = x1 - x0
  const d = z1 - z0
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const lift = 0.34
  const barY = y + lift * 0.42
  const barsX = Array.from({ length: cols - 1 }, (_, i) => x0 + (w * (i + 1)) / cols)
  const barsZ = Array.from({ length: rows - 1 }, (_, i) => z0 + (d * (i + 1)) / rows)
  const metal = { color: '#33302b', roughness: 0.6, metalness: 0.55 }

  return (
    <group>
      <mesh rotation-x={Math.PI / 2} position={[cx, y + lift, cz]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial
          color="#f3e6cc"
          emissive="#ffe1b4"
          emissiveIntensity={glow}
          roughness={1}
        />
      </mesh>
      {barsX.map((x, i) => (
        <mesh key={`x${i}`} position={[x, barY, cz]}>
          <boxGeometry args={[0.07, lift * 0.8, d]} />
          <meshStandardMaterial {...metal} />
        </mesh>
      ))}
      {barsZ.map((z, i) => (
        <mesh key={`z${i}`} position={[cx, barY, z]}>
          <boxGeometry args={[w, lift * 0.72, 0.06]} />
          <meshStandardMaterial {...metal} />
        </mesh>
      ))}
      {/* curb closing the reveal between the ceiling opening and the glass */}
      {[
        { pos: [cx, y + lift / 2, z0], size: [w + 0.1, lift, 0.07] },
        { pos: [cx, y + lift / 2, z1], size: [w + 0.1, lift, 0.07] },
        { pos: [x0, y + lift / 2, cz], size: [0.07, lift, d + 0.1] },
        { pos: [x1, y + lift / 2, cz], size: [0.07, lift, d + 0.1] },
      ].map((c, i) => (
        <mesh key={`c${i}`} position={c.pos}>
          <boxGeometry args={c.size} />
          <meshStandardMaterial {...metal} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Furniture                                                          */
/* ------------------------------------------------------------------ */
function useBlobShadow() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, 'rgba(0,0,0,0.55)')
    g.addColorStop(0.5, 'rgba(0,0,0,0.26)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
    return new THREE.CanvasTexture(c)
  }, [])
}

function BlobShadow({ position, size }) {
  const tex = useBlobShadow()
  return (
    <mesh rotation-x={-Math.PI / 2} position={position} renderOrder={1}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function Bench({ position, rotation = 0, length = 2.4 }) {
  return (
    <group position={position} rotation-y={rotation}>
      <BlobShadow position={[0, 0.012, 0]} size={[length * 1.35, 1.5]} />
      {/* black leather cushion */}
      <mesh position={[0, 0.43, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, 0.17, 0.62]} />
        <meshPhysicalMaterial
          color="#171412"
          roughness={0.62}
          metalness={0}
          clearcoat={0.35}
          clearcoatRoughness={0.55}
          envMapIntensity={0.25}
        />
      </mesh>
      {/* slim steel frame */}
      {[-length / 2 + 0.16, length / 2 - 0.16].map((x) => (
        <mesh key={x} position={[x, 0.18, 0]} castShadow>
          <boxGeometry args={[0.035, 0.36, 0.56]} />
          <meshStandardMaterial color="#0e0d0c" roughness={0.38} metalness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0.035, 0]} castShadow>
        <boxGeometry args={[length - 0.4, 0.02, 0.5]} />
        <meshStandardMaterial color="#0e0d0c" roughness={0.4} metalness={0.65} />
      </mesh>
    </group>
  )
}

function Console({ position, rotation = 0 }) {
  return (
    <group position={position} rotation-y={rotation}>
      <BlobShadow position={[0, 0.012, 0]} size={[2.9, 1.1]} />
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.09, 0.45]} />
        <meshPhysicalMaterial color="#29221b" roughness={0.38} clearcoat={0.5} />
      </mesh>
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} position={[x, 0.39, 0]} castShadow>
          <boxGeometry args={[0.07, 0.78, 0.4]} />
          <meshStandardMaterial color="#1f1a15" roughness={0.45} metalness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Signage                                                            */
/* ------------------------------------------------------------------ */
const SIGN_W = 2.2
const SIGN_H = 0.69
const SIGN_BAR = 0.016
const SIGN_DEPTH = 0.026

// The plaque is a printed face inside a brass frame, so the letters sit on
// metal instead of hovering over the plaster. Everything is painted once into
// a 2.2 x 0.69 m canvas texture.
function makeSignTexture(title, subtitle) {
  const W = 1280
  const H = 400
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)

  // faint sheen, darker at the bottom like a lit metal face
  const sheen = ctx.createLinearGradient(0, 0, 0, H)
  sheen.addColorStop(0, 'rgba(255,242,220,0.10)')
  sheen.addColorStop(0.45, 'rgba(255,240,214,0.02)')
  sheen.addColorStop(1, 'rgba(0,0,0,0.12)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, W, H)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.direction = 'rtl'
  try {
    ctx.letterSpacing = '4px'
  } catch {
    // letter-spacing is a newer canvas feature; the sign still reads without it
  }

  const ink = ctx.createLinearGradient(0, 90, 0, 190)
  ink.addColorStop(0, '#f8efdd')
  ink.addColorStop(0.55, '#e8d7b6')
  ink.addColorStop(1, '#c9b088')
  ctx.fillStyle = ink
  ctx.font = '300 104px "Vazirmatn Variable", Tahoma, sans-serif'
  ctx.fillText(title, W / 2, 168, W - 220)

  // hairline drawn out from a small centre diamond
  ctx.strokeStyle = 'rgba(220,196,154,0.75)'
  ctx.lineWidth = 3
  for (const dir of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(W / 2 + dir * 44, 240)
    ctx.lineTo(W / 2 + dir * 214, 240)
    ctx.stroke()
  }
  ctx.save()
  ctx.translate(W / 2, 240)
  ctx.rotate(Math.PI / 4)
  ctx.fillStyle = 'rgba(232,212,174,0.95)'
  ctx.fillRect(-8, -8, 16, 16)
  ctx.restore()

  ctx.direction = 'ltr'
  try {
    ctx.letterSpacing = '9px'
  } catch {
    // spacing is a nicety here
  }
  ctx.fillStyle = '#c6b291'
  ctx.font = '500 34px "Cormorant Garamond", Georgia, serif'
  ctx.fillText(subtitle.toUpperCase(), W / 2, 294, W - 260)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

function HallSign({ position, rotation, title, subtitle }) {
  const tex = useMemo(() => makeSignTexture(title, subtitle), [title, subtitle])
  const halfW = SIGN_W / 2
  const halfH = SIGN_H / 2
  const brass = [
    { p: [0, halfH + SIGN_BAR / 2, 0], s: [SIGN_W + SIGN_BAR * 2, SIGN_BAR, 0.02] },
    { p: [0, -halfH - SIGN_BAR / 2, 0], s: [SIGN_W + SIGN_BAR * 2, SIGN_BAR, 0.02] },
    { p: [-halfW - SIGN_BAR / 2, 0, 0], s: [SIGN_BAR, SIGN_H, 0.02] },
    { p: [halfW + SIGN_BAR / 2, 0, 0], s: [SIGN_BAR, SIGN_H, 0.02] },
  ]

  return (
    <group position={position} rotation-y={rotation}>
      {/* brushed bronze plate, 26 mm proud of the wall */}
      <mesh position={[0, 0, -SIGN_DEPTH / 2]} castShadow receiveShadow>
        <boxGeometry args={[SIGN_W + SIGN_BAR * 2, SIGN_H + SIGN_BAR * 2, SIGN_DEPTH]} />
        <meshStandardMaterial color="#241d16" metalness={0.6} roughness={0.42} envMapIntensity={0.75} />
      </mesh>

      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[SIGN_W, SIGN_H]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>

      {brass.map((bar, i) => (
        <mesh key={i} position={bar.p} castShadow>
          <boxGeometry args={bar.s} />
          <meshStandardMaterial color="#c9a86a" metalness={0.9} roughness={0.28} envMapIntensity={1} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Lighting                                                           */
/* ------------------------------------------------------------------ */
const SOFT_SHADOWS = typeof window === 'undefined' || !window.matchMedia('(hover: none)').matches

// A slightly different lamp temperature per hall keeps the rooms from reading
// as one flat space without touching their geometry.
const HALL_TONES = ['#ffd8a4', '#ffddb2', '#ffd29c', '#ffe2bd', '#ffcf9f']

function TrackCan({ position, tilt = 0 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.011, 0.011, 0.2, 6]} />
        <meshStandardMaterial color="#0b0a08" metalness={0.5} roughness={0.4} />
      </mesh>
      <group rotation-z={tilt}>
        <mesh position={[0, -0.06, 0]} castShadow>
          <cylinderGeometry args={[0.056, 0.077, 0.2, 20, 1, true]} />
          <meshStandardMaterial color="#0d0c0a" metalness={0.55} roughness={0.32} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.161, 0]} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.057, 20]} />
          <meshStandardMaterial color="#fff2d9" emissive="#ffd29a" emissiveIntensity={2.6} roughness={1} />
        </mesh>
      </group>
    </group>
  )
}

function TrackRail({ position, length, rotation = 0 }) {
  return (
    <mesh position={position} rotation-y={rotation}>
      <boxGeometry args={[0.05, 0.055, length]} />
      <meshStandardMaterial color="#0b0a08" metalness={0.6} roughness={0.38} />
    </mesh>
  )
}

function GallerySpot({ position, target, intensity = 7, color = '#ffd8a4' }) {
  const light = useRef()
  const obj = useMemo(() => new THREE.Object3D(), [])
  return (
    <>
      <primitive object={obj} position={target} />
      <spotLight
        ref={light}
        position={position}
        target={obj}
        angle={0.38}
        penumbra={0.95}
        intensity={intensity}
        distance={17}
        decay={2}
        color={color}
        castShadow={SOFT_SHADOWS}
        shadow-mapSize={[SPOT_SHADOW_SIZE, SPOT_SHADOW_SIZE]}
        shadow-bias={-0.0012}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />
    </>
  )
}

function HallLighting({ hall, artworks }) {
  const b = hall.bounds
  const arts = artworks.filter((a) => a.hall === hall.id)
  if (!arts.length) return null

  // The photoreal test hall uses a near-neutral lamp so the real textures are
  // judged on their own colour; the other halls keep their warm tones.
  const tone =
    hall.id === PHOTOREAL_HALL ? '#fff3e4' : HALL_TONES[(hall.index - 1) % HALL_TONES.length]

  return (
    <group>
      {arts.map((art) => {
        const { x, z, y, rotY } = art.spot
        const nx = Math.sin(rotY)
        const nz = Math.cos(rotY)
        const px = x + nx * 0.95
        const pz = z + nz * 0.95
        // A wall whose normal points along z carries its track along x.
        const acrossX = Math.abs(nz) < 0.5
        const tilt = acrossX ? 0 : hall.side === 'west' ? -0.5 : 0.5
        return (
          <group key={art.id}>
            <TrackRail
              position={[px, b.h - 0.05, pz]}
              length={2.2}
              rotation={acrossX ? Math.PI / 2 : 0}
            />
            <TrackCan position={[px, b.h - 0.08, pz]} tilt={tilt} />
            <GallerySpot
              position={[px, b.h - 0.27, pz]}
              target={[x + nx * 0.1, y, z + nz * 0.1]}
              intensity={70}
              color={tone}
            />
          </group>
        )
      })}
      <pointLight
        position={[(b.x0 + b.x1) / 2, b.h - 1.0, (b.z0 + b.z1) / 2]}
        intensity={hall.id === PHOTOREAL_HALL ? 1.15 : 2.4}
        distance={14}
        decay={2}
        color={tone}
      />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Rooms                                                              */
/* ------------------------------------------------------------------ */
// The shallow vestibule behind the spawn point. It mirrors the lobby entrance:
// a lit recess with cream side walls, a glowing end panel and a brass casing,
// so the doorway the visitor arrived through is behind them in every hall.
function EntryBay({ hall }) {
  const b = hall.bounds
  const door = hall.door
  const west = hall.side === 'west'
  const wallX = west ? b.x1 : b.x0
  const dir = west ? 1 : -1
  const back = wallX + dir * ENTRY_DEPTH
  const zc = door.center
  const halfW = door.width / 2
  const h = door.height
  const cx = (wallX + back) / 2

  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[cx, h / 2, zc + s * (halfW + 0.09)]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[ENTRY_DEPTH, h, 0.18]} />
          <meshStandardMaterial color="#d6cbb8" roughness={0.92} />
        </mesh>
      ))}

      {/* the end of the vestibule: a pair of tall doors back out of the gallery */}
      <mesh position={[back, h / 2, zc]} rotation-y={west ? -Math.PI / 2 : Math.PI / 2}>
        <planeGeometry args={[halfW * 2, h]} />
        <meshStandardMaterial color="#e8dcc6" roughness={1} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[back - dir * 0.06, 1.37, zc + s * (0.045 + (halfW - 0.22) / 2)]}>
            <boxGeometry args={[0.08, 2.74, halfW - 0.22]} />
            <meshStandardMaterial color="#3b332a" roughness={0.52} metalness={0.3} envMapIntensity={0.5} />
          </mesh>
          {[0.72, 1.82].map((py) => (
            <mesh
              key={py}
              position={[back - dir * 0.103, py, zc + s * (0.045 + (halfW - 0.22) / 2)]}
            >
              <boxGeometry args={[0.012, 0.92, halfW - 0.52]} />
              <meshStandardMaterial color="#4a4034" roughness={0.45} metalness={0.35} />
            </mesh>
          ))}
        </group>
      ))}
      {/* brass surround of the door opening */}
      {[-1, 1].map((s) => (
        <mesh key={`j${s}`} position={[back - dir * 0.02, 1.38, zc + s * (halfW - 0.04)]}>
          <boxGeometry args={[0.14, 2.76, 0.09]} />
          <meshStandardMaterial color="#b9965a" roughness={0.4} metalness={0.8} />
        </mesh>
      ))}
      <mesh position={[back - dir * 0.02, 2.78, zc]}>
        <boxGeometry args={[0.14, 0.09, halfW * 2]} />
        <meshStandardMaterial color="#b9965a" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* handles and the seam of light under the leaves */}
      {[-1, 1].map((s) => (
        <mesh key={`h${s}`} position={[back - dir * 0.14, 1.22, zc + s * 0.105]}>
          <boxGeometry args={[0.035, 0.82, 0.035]} />
          <meshStandardMaterial color="#c9a86a" roughness={0.32} metalness={0.85} />
        </mesh>
      ))}
      <mesh position={[back - dir * 0.115, 0.015, zc]}>
        <boxGeometry args={[0.03, 0.03, halfW * 2 - 0.42]} />
        <meshStandardMaterial color="#fff3dc" emissive="#ffe9c2" emissiveIntensity={1.1} roughness={1} />
      </mesh>

      <mesh rotation-x={Math.PI / 2} position={[cx, h - 0.005, zc]}>
        <planeGeometry args={[ENTRY_DEPTH, halfW * 2]} />
        <meshStandardMaterial color="#2b2723" emissive="#221d18" emissiveIntensity={0.4} roughness={0.95} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[cx, h - 0.03, zc]}>
        <planeGeometry args={[ENTRY_DEPTH * 0.55, halfW * 2 - 0.7]} />
        <meshStandardMaterial color="#f6ecd8" emissive="#ffe9c4" emissiveIntensity={0.75} roughness={1} />
      </mesh>

      {/* brass casing on the room side of the opening */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[wallX - dir * 0.05, h / 2, zc + s * (halfW + 0.05)]}>
          <boxGeometry args={[0.1, h, 0.1]} />
          <meshStandardMaterial color="#c9a86a" metalness={0.85} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[wallX - dir * 0.05, h + 0.05, zc]}>
        <boxGeometry args={[0.1, 0.1, halfW * 2 + 0.2]} />
        <meshStandardMaterial color="#c9a86a" metalness={0.85} roughness={0.35} />
      </mesh>

      {/* stone threshold, wide enough to cover the floor seam */}
      <mesh position={[wallX, 0.008, zc]} receiveShadow>
        <boxGeometry args={[0.52, 0.016, halfW * 2]} />
        <meshStandardMaterial color="#2a2622" roughness={0.5} metalness={0.2} />
      </mesh>
    </group>
  )
}

function RoomShell({ hall, textures, activeHall, artworks, photo, envMap }) {
  const b = hall.bounds
  const door = hall.door
  const westEntry = hall.side === 'west'
  const photoWall = usePhotoWallMaterial(photo ? photo.plaster : null, envMap)
  const wallMat = photoWall || useWallMaterial(textures.plaster)
  const doorway = [
    { start: door.center - door.width / 2, end: door.center + door.width / 2, top: door.height },
  ]
  const sky = { x0: b.x0 + 2.2, x1: b.x1 - 2.2, z0: b.z0 + 2.2, z1: b.z1 - 2.2 }

  // The plaque hangs on the east wall next to the door, but a painting may
  // already own that stretch of wall (hall 4 does). Step along the wall until a
  // clear span is found so the sign never lands on a work.
  const signZ = useMemo(() => {
    const covered = artworks
      .filter(
        (a) =>
          Math.abs(a.spot.x - b.x1) < 0.6 && a.spot.z > b.z0 - 1 && a.spot.z < b.z1 + 1
      )
      .map((a) => [a.spot.z - a.spot.w / 2 - 0.55, a.spot.z + a.spot.w / 2 + 0.55])
    const dir = westEntry ? 1 : -1
    const halfSpan = SIGN_W / 2 + 0.2
    const fits = (z) =>
      z - halfSpan > b.z0 + 0.4 &&
      z + halfSpan < b.z1 - 0.4 &&
      !covered.some(([lo, hi]) => z + halfSpan > lo && z - halfSpan < hi)
    const offsets = [2.6, -2.6, 5.2, -5.2, 0, 7.4, -7.4]
    const spot = offsets.map((o) => door.center + o * dir).find(fits)
    return spot ?? door.center + 2.6 * dir
  }, [artworks, b.x1, b.z0, b.z1, door.center, westEntry])

  return (
    <group>
      {/* the floor runs on into the entrance bay, so there is no seam at the door */}
      <Floor
        x0={westEntry ? b.x0 : b.x0 - ENTRY_DEPTH}
        x1={westEntry ? b.x1 + ENTRY_DEPTH : b.x1}
        z0={b.z0}
        z1={b.z1}
        kind={hall.floor}
        marble={textures.marble}
        wood={textures.wood}
      />

      <WallRun axis="x" fixed={b.z0} from={b.x0 - T / 2} to={b.x1 + T / 2} height={b.h} material={wallMat} />
      <WallRun axis="x" fixed={b.z1} from={b.x0 - T / 2} to={b.x1 + T / 2} height={b.h} material={wallMat} />
      <WallRun
        axis="z"
        fixed={b.x0}
        from={b.z0}
        to={b.z1}
        height={b.h}
        material={wallMat}
        gaps={westEntry ? [] : doorway}
      />
      <WallRun
        axis="z"
        fixed={b.x1}
        from={b.z0}
        to={b.z1}
        height={b.h}
        material={wallMat}
        gaps={westEntry ? doorway : []}
      />

      {/* ceiling panels around a glazed roof, as in the lobby */}
      <CeilingPanel x0={b.x0} x1={sky.x0} z0={b.z0} z1={b.z1} y={b.h} color="#2a2622" />
      <CeilingPanel x0={sky.x1} x1={b.x1} z0={b.z0} z1={b.z1} y={b.h} color="#2a2622" />
      <CeilingPanel x0={sky.x0} x1={sky.x1} z0={b.z0} z1={sky.z0} y={b.h} color="#2a2622" />
      <CeilingPanel x0={sky.x0} x1={sky.x1} z0={sky.z1} z1={b.z1} y={b.h} color="#2a2622" />
      <Skylight x0={sky.x0} x1={sky.x1} z0={sky.z0} z1={sky.z1} y={b.h} glow={0.42} />

      <EntryBay hall={hall} />

      {activeHall === hall.id && <HallLighting hall={hall} artworks={artworks} />}

      <Bench
        position={
          hall.side === 'west' ? [b.x0 + 3.7, 0, door.center] : [b.x1 - 3.7, 0, door.center]
        }
        rotation={Math.PI / 2}
        length={2.2}
      />
      <HallSign
        position={[b.x1 - 0.168, 2.25, signZ]}
        rotation={-Math.PI / 2}
        title={hall.name}
        subtitle={hall.en}
      />
    </group>
  )
}

// cached material so every wall shares one texture upload
const wallMaterialCache = new WeakMap()
function useWallMaterial(plaster) {
  if (!plaster) return null
  if (wallMaterialCache.has(plaster)) return wallMaterialCache.get(plaster)
  const t = plaster.clone()
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1, 1)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  t.needsUpdate = true
  const m = new THREE.MeshStandardMaterial({
    map: t,
    color: '#3a3833',
    roughness: 0.98,
    metalness: 0,
    envMapIntensity: 0.18,
  })
  wallMaterialCache.set(plaster, m)
  return m
}

/* ------------------------------------------------------------------ */
/*  Lobby                                                              */
/* ------------------------------------------------------------------ */
function Lobby({ textures, activeHall, photo, envMap }) {
  const lobby = HALLS.lobby
  const b = lobby.bounds
  const wallMat = usePhotoWallMaterial(photo ? photo.plaster : null, envMap) || useWallMaterial(textures.plaster)
  const southGap = [
    { start: -lobby.entrance.width / 2, end: lobby.entrance.width / 2, top: lobby.entrance.height },
  ]
  const skylight = { x0: -4.2, x1: 4.2, z0: 3, z1: 12.5 }

  return (
    <group>
      <Floor x0={b.x0} x1={b.x1} z0={b.z0} z1={b.z1} kind="marble" marble={textures.marble} wood={textures.wood} />

      <WallRun axis="x" fixed={b.z0} from={b.x0 - T / 2} to={b.x1 + T / 2} height={b.h} material={wallMat} />
      <WallRun axis="x" fixed={b.z1} from={b.x0 - T / 2} to={b.x1 + T / 2} height={b.h} material={wallMat} gaps={southGap} />
      <WallRun axis="z" fixed={b.x0} from={b.z0} to={b.z1} height={b.h} material={wallMat} />
      <WallRun axis="z" fixed={b.x1} from={b.z0} to={b.z1} height={b.h} material={wallMat} />

      {/* ceiling around the skylight */}
      <CeilingPanel x0={b.x0} x1={skylight.x0} z0={b.z0} z1={b.z1} y={b.h} />
      <CeilingPanel x0={skylight.x1} x1={b.x1} z0={b.z0} z1={b.z1} y={b.h} />
      <CeilingPanel x0={skylight.x0} x1={skylight.x1} z0={b.z0} z1={skylight.z0} y={b.h} />
      <CeilingPanel x0={skylight.x0} x1={skylight.x1} z0={skylight.z1} z1={b.z1} y={b.h} />

      {/* glazed roof with its mullion grid */}
      <Skylight
        x0={skylight.x0}
        x1={skylight.x1}
        z0={skylight.z0}
        z1={skylight.z1}
        y={b.h}
        cols={4}
        rows={4}
      />

      {/* entry vestibule */}
      <group>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, (VESTIBULE.z0 + VESTIBULE.z1) / 2]} receiveShadow>
          <planeGeometry args={[VESTIBULE.x1 - VESTIBULE.x0, VESTIBULE.z1 - VESTIBULE.z0]} />
          <meshPhysicalMaterial
            map={textures.marble}
            color="#f3efe6"
            roughness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.12}
            envMapIntensity={0.7}
          />
        </mesh>
        <CeilingPanel x0={VESTIBULE.x0} x1={VESTIBULE.x1} z0={VESTIBULE.z0} z1={VESTIBULE.z1} y={VESTIBULE.h} color="#2b2723" />
        <mesh position={[VESTIBULE.x0, VESTIBULE.h / 2, (VESTIBULE.z0 + VESTIBULE.z1) / 2]}>
          <boxGeometry args={[0.2, VESTIBULE.h, VESTIBULE.z1 - VESTIBULE.z0]} />
          <meshStandardMaterial color="#e9e2d5" roughness={0.9} />
        </mesh>
        <mesh position={[VESTIBULE.x1, VESTIBULE.h / 2, (VESTIBULE.z0 + VESTIBULE.z1) / 2]}>
          <boxGeometry args={[0.2, VESTIBULE.h, VESTIBULE.z1 - VESTIBULE.z0]} />
          <meshStandardMaterial color="#e9e2d5" roughness={0.9} />
        </mesh>
        <mesh rotation-y={Math.PI} position={[0, VESTIBULE.h / 2, VESTIBULE.z1]}>
          <planeGeometry args={[VESTIBULE.x1 - VESTIBULE.x0, VESTIBULE.h]} />
          <meshStandardMaterial color="#fdf7ea" emissive="#fff2d8" emissiveIntensity={0.7} roughness={1} />
        </mesh>
        <mesh rotation-x={Math.PI / 2} position={[0, VESTIBULE.h - 0.01, (VESTIBULE.z0 + VESTIBULE.z1) / 2]}>
          <planeGeometry args={[1.1, VESTIBULE.z1 - VESTIBULE.z0]} />
          <meshStandardMaterial color="#fffaf0" emissive="#fff4e2" emissiveIntensity={1.6} roughness={1} />
        </mesh>
      </group>

      {activeHall === 'lobby' && (
        <group>
          <TrackCan position={[-5.4, b.h - 0.08, 1.5]} tilt={-0.35} />
          <GallerySpot position={[-5.4, b.h - 0.27, 1.5]} target={[-5.8, 2.5, 0.1]} intensity={95} />
          <TrackCan position={[-7.3, b.h - 0.08, 8.6]} tilt={-0.35} />
          <GallerySpot position={[-7.3, b.h - 0.27, 8.6]} target={[-8.9, 1.95, 8.6]} intensity={68} />
          <TrackCan position={[7.3, b.h - 0.08, 8.6]} tilt={0.35} />
          <GallerySpot position={[7.3, b.h - 0.27, 8.6]} target={[8.9, 1.9, 8.6]} intensity={68} />
          <pointLight position={[0, 6.1, 8]} intensity={3.5} distance={22} decay={2} color="#ffca8f" />
        </group>
      )}

      <Bench position={[0, 0, 8.6]} length={2.2} />
      <Console position={[-7.2, 0, 2.0]} rotation={Math.PI / 2} />

      <HallSign position={[6.2, 3.15, 0.168]} rotation={0} title="گالری آریانا" subtitle="ARIANA CONTEMPORARY GALLERY" />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Artwork streaming                                                  */
/* ------------------------------------------------------------------ */
// Paintings are downloaded per hall: the hall the visitor is in (or is about to
// enter) is unlocked by the route, and hovering a hall button warms the rest.
const HALL_GROUPS = HALL_ORDER

// Shadow maps are frozen after start-up; this re-arms them for a moment when a
// hall's paintings mount or the visitor changes halls, then they stay cached.
function StaticShadows({ trigger }) {
  const { gl } = useThree()
  const frames = useRef(0)

  useEffect(() => {
    frames.current = 90
  }, [trigger])

  useFrame(() => {
    if (frames.current <= 0) return
    frames.current -= 1
    gl.shadowMap.needsUpdate = true
  })

  return null
}

function HallArtworks({ hallId, artworks, onOpen }) {
  const unlocked = useHallUnlocked(hallId)
  if (!unlocked) return null

  return (
    <group>
      {artworks
        .filter((art) => art.hall === hallId)
        .map((art) => (
          <Artwork key={art.id} art={art} onOpen={() => onOpen(art)} />
        ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Main scene                                                         */
/* ------------------------------------------------------------------ */
export default function Gallery({ activeHall, artworks, onOpenArtwork }) {
  const textures = useGalleryTextures()
  // Every wall uses the photo plaster, so the three small maps load with the
  // scene instead of waiting for the visitor to enter one hall.
  const photo = usePhotorealTextures()
  const envMap = useStudioEnv(assetUrl('/tex/env_studio.webp'))
  const unlockVersion = useUnlockVersion()

  return (
    <group>
      <StudioEnvironment />
      <StaticShadows trigger={`${activeHall}:${unlockVersion}`} />

      <ambientLight intensity={0.07} color="#ffeacd" />
      <hemisphereLight args={['#8a7b63', '#100d0a', 0.18]} />

      <directionalLight
        position={[-16, 30, 22]}
        intensity={0.28}
        color="#fff2dd"
        castShadow
        shadow-mapSize={[SUN_SHADOW_SIZE, SUN_SHADOW_SIZE]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={90}
      />

      <Lobby textures={textures} activeHall={activeHall} photo={photo} envMap={envMap} />
      {HALL_ORDER.filter((id) => id !== 'lobby').map((id) => (
        <RoomShell
          key={id}
          hall={HALLS[id]}
          textures={textures}
          activeHall={activeHall}
          artworks={artworks}
          photo={photo}
          envMap={envMap}
        />
      ))}

      {HALL_GROUPS.map((id) => (
        <Suspense key={id} fallback={null}>
          <HallArtworks hallId={id} artworks={artworks} onOpen={onOpenArtwork} />
        </Suspense>
      ))}
    </group>
  )
}
