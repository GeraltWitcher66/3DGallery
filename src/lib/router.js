import { useEffect, useState } from 'react'

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
const BASE_RE = new RegExp(`^${BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')

const PATH_TO_HALL = {
  '/': 'lobby',
  '/lobby': 'lobby',
  '/hall-1': 'hall-1',
  '/hall-2': 'hall-2',
  '/hall-3': 'hall-3',
  '/hall-4': 'hall-4',
  '/hall-5': 'hall-5',
}

/** `/hall-1/AR-1402-04` → { hall: 'hall-1', art: 'AR-1402-04' } */
export function routeFromPath(pathname) {
  const local = (pathname || '/').replace(BASE_RE, '').replace(/\/+$/, '') || '/'
  const [head, ...rest] = local.split('/').filter(Boolean)
  if (!head) return { hall: 'lobby', art: null }
  const hall = PATH_TO_HALL[`/${head}`]
  if (!hall) return { hall: 'lobby', art: null }
  return { hall, art: rest[0] || null }
}

export function pathForHall(hallId) {
  return `${BASE}${hallId === 'lobby' ? '/' : `/${hallId}`}`
}

export function pathForArtwork(hallId, artId) {
  return `${BASE}/${hallId}/${artId}`
}

export function useRoute() {
  const [route, setRoute] = useState(() => routeFromPath(window.location.pathname))

  useEffect(() => {
    const onPop = () => setRoute(routeFromPath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const push = (path) => {
    if (window.location.pathname !== path) window.history.pushState({}, '', path)
  }

  const goHall = (hallId) => {
    push(pathForHall(hallId))
    setRoute({ hall: hallId, art: null })
  }

  const goArtwork = (art) => {
    push(pathForArtwork(art.hall, art.id))
    setRoute({ hall: art.hall, art: art.id })
  }

  const closeArtwork = () => {
    push(pathForHall(route.hall))
    setRoute({ hall: route.hall, art: null })
  }

  return [route, { goHall, goArtwork, closeArtwork }]
}
