import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { HALLS, HALL_ORDER, VESTIBULE } from '../data/gallery'
import {
  useGalleryTextures,
  useTiled,
  useTiledSet,
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

// Photoreal test: this one hall uses CC0 photo textures and a real HDR
// environment; the other halls keep the original materials for comparison.
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
function Floor({ x0, x1, z0, z1, kind, marble, wood, photo, envMap }) {
  const w = x1 - x0
  const d = z1 - z0
  const marbleMap = useTiled(marble, w / 3.1, d / 3.1)
  const woodMap = useTiled(wood, w / 1.35, d / 1.35)
  const photoMap = useTiledSet(photo, w / 1.35, d / 1.35)
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]}
      receiveShadow
    >
      <planeGeometry args={[w, d]} />
      {photoMap ? (
        <meshStandardMaterial
          map={photoMap.map}
          normalMap={photoMap.normalMap}
          normalScale={[0.22, 0.22]}
          color="#f2ebdf"
          roughness={1}
          metalness={0}
        />
      ) : kind === 'marble' ? (
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

function LightStrip({ position, size, intensity = 2.2, color = '#fff3e0' }) {
  return (
    <mesh position={position} rotation-x={Math.PI / 2}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        color="#1b1916"
        emissive={color}
        emissiveIntensity={intensity}
        roughness={1}
      />
    </mesh>
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
function makeSignTexture(title, subtitle) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 320
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, c.width, c.height)
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  ctx.fillStyle = '#e8dcc6'
      ctx.font = '300 108px "Vazirmatn Variable", Tahoma, sans-serif'
  ctx.fillText(title, 1000, 130)
  ctx.fillStyle = '#a2957f'
  ctx.font = '400 44px "Cormorant Garamond", Georgia, serif'
  ctx.direction = 'ltr'
  ctx.textAlign = 'right'
  ctx.fillText(subtitle, 1000, 210)
  ctx.strokeStyle = 'rgba(210,190,160,0.45)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(700, 250)
  ctx.lineTo(1000, 250)
  ctx.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

function HallSign({ position, rotation, title, subtitle }) {
  const tex = useMemo(() => makeSignTexture(title, subtitle), [title, subtitle])
  return (
    <mesh position={position} rotation-y={rotation}>
      <planeGeometry args={[2.2, 0.69]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
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
function RoomShell({ hall, textures, activeHall, artworks, photo, envMap }) {
  const b = hall.bounds
  const door = hall.door
  const photoWall = usePhotoWallMaterial(photo ? photo.plaster : null, envMap)
  const wallMat = photoWall || useWallMaterial(textures.plaster)

  return (
    <group>
      <Floor
        x0={b.x0}
        x1={b.x1}
        z0={b.z0}
        z1={b.z1}
        kind={hall.floor}
        marble={textures.marble}
        wood={textures.wood}
        photo={photo ? photo.parquet : null}
        envMap={envMap}
      />

      <WallRun axis="x" fixed={b.z0} from={b.x0 - T / 2} to={b.x1 + T / 2} height={b.h} material={wallMat} />
      <WallRun axis="x" fixed={b.z1} from={b.x0 - T / 2} to={b.x1 + T / 2} height={b.h} material={wallMat} />
      <WallRun axis="z" fixed={b.x0} from={b.z0} to={b.z1} height={b.h} material={wallMat} />
      <WallRun axis="z" fixed={b.x1} from={b.z0} to={b.z1} height={b.h} material={wallMat} />

      {/* ceiling with two recessed light lines */}
      <CeilingPanel x0={b.x0} x1={b.x1} z0={b.z0} z1={b.z1} y={b.h} color="#2a2622" />
      {[b.z0 + (b.z1 - b.z0) * 0.3, b.z0 + (b.z1 - b.z0) * 0.7].map((z, i) => (
        <LightStrip key={i} position={[(b.x0 + b.x1) / 2, b.h - 0.005, z]} size={[3.6, 0.14]} intensity={1.5} />
      ))}

      {activeHall === hall.id && <HallLighting hall={hall} artworks={artworks} />}

      <Bench
        position={
          hall.side === 'west' ? [b.x0 + 3.7, 0, door.center] : [b.x1 - 3.7, 0, door.center]
        }
        rotation={Math.PI / 2}
        length={2.2}
      />
      <HallSign
        position={
          hall.side === 'west'
            ? [b.x1 - 0.145, 2.25, door.center + 2.6]
            : [b.x1 - 0.145, 2.25, door.center - 2.6]
        }
        rotation={hall.side === 'west' ? -Math.PI / 2 : Math.PI / 2}
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
function Lobby({ textures, activeHall }) {
  const lobby = HALLS.lobby
  const b = lobby.bounds
  const wallMat = useWallMaterial(textures.plaster)
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

      {/* glowing skylight + mullions */}
              <mesh rotation-x={Math.PI / 2} position={[(skylight.x0 + skylight.x1) / 2, b.h + 0.75, (skylight.z0 + skylight.z1) / 2]}>
        <planeGeometry args={[skylight.x1 - skylight.x0, skylight.z1 - skylight.z0]} />
        <meshStandardMaterial color="#e6d7bc" emissive="#ffdcaa" emissiveIntensity={0.45} roughness={1} />
      </mesh>
      {[-1.6, 0, 1.6].map((x, i) => (
        <mesh key={i} position={[(skylight.x0 + skylight.x1) / 2 + x, b.h + 0.4, (skylight.z0 + skylight.z1) / 2]}>
          <boxGeometry args={[0.06, 0.32, skylight.z1 - skylight.z0]} />
          <meshStandardMaterial color="#2f2b26" roughness={0.6} metalness={0.5} />
        </mesh>
      ))}
      {[5.2, 8.4, 11.2].map((z, i) => (
        <mesh key={i} position={[(skylight.x0 + skylight.x1) / 2, b.h + 0.4, z]}>
          <boxGeometry args={[skylight.x1 - skylight.x0, 0.28, 0.05]} />
          <meshStandardMaterial color="#2f2b26" roughness={0.6} metalness={0.5} />
        </mesh>
      ))}

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

      <HallSign position={[6.2, 3.15, 0.145]} rotation={0} title="گالری آریانا" subtitle="ARIANA CONTEMPORARY GALLERY" />
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
  // The photoreal set is fetched only while the visitor is inside the test hall.
  const inPhotoHall = activeHall === PHOTOREAL_HALL
  const photo = usePhotorealTextures(inPhotoHall)
  const envMap = useStudioEnv(assetUrl('/tex/env_studio.webp'), inPhotoHall)
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

      <Lobby textures={textures} activeHall={activeHall} />
      {HALL_ORDER.filter((id) => id !== 'lobby').map((id) => (
        <RoomShell
          key={id}
          hall={HALLS[id]}
          textures={textures}
          activeHall={activeHall}
          artworks={artworks}
          photo={id === PHOTOREAL_HALL ? photo : null}
          envMap={id === PHOTOREAL_HALL ? envMap : null}
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
