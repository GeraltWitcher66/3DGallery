const BASE = import.meta.env.BASE_URL || '/'

/** Resolve a root-relative public file (e.g. /art/art-01.jpg) against Vite's base. */
export function assetUrl(path) {
  return `${BASE}${String(path || '').replace(/^\/+/, '')}`
}
