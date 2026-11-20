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

export function hallFromPath(pathname) {
  const local = (pathname || '/').replace(BASE_RE, '')
  const clean = local.replace(/\/+$/, '') || '/'
  return PATH_TO_HALL[clean] || 'lobby'
}

export function pathForHall(hallId) {
  return `${BASE}${hallId === 'lobby' ? '/' : `/${hallId}`}`
}

export function useHallRoute() {
  const [hall, setHall] = useState(() => hallFromPath(window.location.pathname))

  useEffect(() => {
    const onPop = () => setHall(hallFromPath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = (hallId) => {
    const path = pathForHall(hallId)
    if (window.location.pathname !== path) window.history.pushState({}, '', path)
    setHall(hallId)
  }

  return [hall, navigate]
}
