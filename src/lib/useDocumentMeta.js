import { useEffect } from 'react'

const SITE = 'گالری آریانا'

function setMeta(key, value, attr = 'name') {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

/** Keeps the tab title and share metadata in step with the current view. */
export function useDocumentMeta({ title, description, image }) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE}` : `${SITE} — گالری هنری مجازی سه‌بعدی`
    setMeta('description', description)
    setMeta('og:title', document.title, 'property')
    setMeta('og:description', description, 'property')
    setMeta('og:type', 'website', 'property')
    if (image) {
      setMeta('og:image', image, 'property')
      setMeta('image', image, 'itemprop')
    } else {
      document.head.querySelector('meta[property="og:image"]')?.remove()
      document.head.querySelector('meta[itemprop="image"]')?.remove()
    }
  }, [title, description, image])
}
