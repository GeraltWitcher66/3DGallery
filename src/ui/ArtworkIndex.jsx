import { HALL_LIST, ARTWORKS } from '../data/gallery'
import { useModal } from '../lib/useModal'
import { preloadHall } from '../lib/preload'

// Text-only on purpose: opening the index must not pull every painting down.
const GROUPS = HALL_LIST

export default function ArtworkIndex({ onOpen, onClose }) {
  const dialogRef = useModal(onClose)

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="index-title">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card index-card" ref={dialogRef}>
        <button className="modal-close" onClick={onClose} aria-label="بستن">
          ×
        </button>
        <p className="modal-kicker">فهرست آثار</p>
        <h2 id="index-title">بیست‌ویک اثر مجموعه</h2>
        <p className="modal-foot index-intro">
          با صفحه‌کلید هم می‌توانید اثر را انتخاب کنید؛ هر اثر نشانی اختصاصی خودش را دارد.
        </p>

        <div className="index-halls">
          {GROUPS.map((hall) => {
            const items = ARTWORKS.filter((art) => art.hall === hall.id)
            if (!items.length) return null
            return (
              <section className="index-hall" key={hall.id}>
                <h3>
                  {hall.id === 'lobby' ? 'سالن اصلی' : hall.name}
                  <span>{hall.tagline}</span>
                </h3>
                <ul>
                  {items.map((art) => (
                    <li key={art.id}>
                      <button
                        className="index-item"
                        onClick={() => onOpen(art)}
                        onPointerEnter={() => preloadHall(art.hall)}
                        onFocus={() => preloadHall(art.hall)}
                      >
                        <span className="index-item-title">{art.title}</span>
                        <span className="index-item-meta">
                          {art.artist} · {art.year}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
