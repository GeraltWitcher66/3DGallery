import { useEffect, useState } from 'react'

export default function OrientationHint({ active }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!active) {
      setVisible(false)
      return
    }
    const mq = window.matchMedia('(orientation: portrait) and (max-width: 960px)')
    const sync = () => setVisible(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    const timer = setTimeout(() => setVisible(false), 9000)
    return () => {
      mq.removeEventListener('change', sync)
      clearTimeout(timer)
    }
  }, [active])

  if (!visible) return null
  return (
    <p className="rotate-hint" role="status">
      برای دید بهتر، گوشی را افقی بگیرید
    </p>
  )
}
