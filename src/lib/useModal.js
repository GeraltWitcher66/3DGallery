import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keeps keyboard focus inside a dialog, closes it on Escape and hands focus back
 * to whatever was focused before opening. Attach the returned ref to the dialog
 * element that wraps the focusable content.
 */
export function useModal(onClose, initialFocus) {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const node = ref.current
    const previous = document.activeElement

    const focusables = () =>
      node ? [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0) : []

    const target = initialFocus?.current || focusables()[0]
    if (target) target.focus()
    else if (node) {
      node.tabIndex = -1
      node.focus()
    }

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current?.()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (items.length < 2) return
      const first = items[0]
      const last = items[items.length - 1]
      const inside = node.contains(document.activeElement)
      if (event.shiftKey && (!inside || document.activeElement === first)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      if (previous && typeof previous.focus === 'function') previous.focus()
    }
  }, [initialFocus])

  return ref
}
