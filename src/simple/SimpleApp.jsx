import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ARTWORKS, HALL_LIST, HALLS, artworksOfHall } from '../data/gallery'
import { artSrcSet, artThumb } from '../lib/artImages'
import { faNum } from '../lib/format'
import { pathForArtwork, pathForHall, useRoute } from '../lib/router'
import { loadScene3D } from '../lib/sceneLoader'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import { viewMode } from '../lib/viewMode'
import Lightbox from '../ui/Lightbox'

// Rough download of the 3D experience: the scene script plus the first room's
// textures and paintings. Measured on the production build.
const SCENE_SIZE = '۱٫۲ مگابایت'

const NOTES = {
  webgl: 'مرورگر این دستگاه نمایش سه‌بعدی را پشتیبانی نمی‌کند؛ نمای ساده نمایش داده می‌شود.',
  context: 'اتصال گرافیکی قطع شد؛ به نمای ساده برگشتیم.',
  error: 'نمایش سه‌بعدی ممکن نشد؛ نمای ساده نمایش داده می‌شود.',
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function SimpleApp({ note }) {
  const [route, nav] = useRoute()
  const [noteClosed, setNoteClosed] = useState(false)
  const scrolled = useRef(false)
  const hadArtwork = useRef(false)

  const hall = HALLS[route.hall] || HALLS.lobby

  const selected = useMemo(
    () => (route.art ? ARTWORKS.find((item) => item.id === route.art) || null : null),
    [route.art]
  )

  const siblings = useMemo(
    () => (selected ? ARTWORKS.filter((art) => art.hall === selected.hall) : []),
    [selected]
  )
  const position = selected ? siblings.findIndex((art) => art.id === selected.id) : -1
  const prevArt = position > 0 ? siblings[position - 1] : null
  const nextArt = position >= 0 && position < siblings.length - 1 ? siblings[position + 1] : null

  useDocumentMeta({
    title: selected ? `${selected.title} — ${selected.artist}` : `${hall.name} — ${hall.tagline}`,
    description: selected
      ? `${selected.title}، ${selected.artist} (${selected.year}). ${selected.medium}. ${selected.dims}.`
      : `${hall.name} — ${hall.tagline} · ${hall.en}. گالری آریانا، گالری هنری مجازی.`,
    image: selected ? window.location.origin + artThumb(selected.img) : undefined,
  })

  // A deep link has to land on the hall or open the artwork, just like the 3D view.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const behavior = reducedMotion() || !scrolled.current ? 'auto' : 'smooth'
    if (route.art) {
      const card = document.getElementById(`art-${route.art}`)
      if (card) card.scrollIntoView({ behavior: 'auto', block: 'center' })
      hadArtwork.current = true
      return
    }
    // Closing the lightbox should leave the page where the visitor was.
    if (hadArtwork.current) {
      hadArtwork.current = false
      return
    }
    const section = document.getElementById(route.hall)
    if (section) section.scrollIntoView({ behavior, block: 'start' })
    scrolled.current = true
  }, [route.hall, route.art])

  const closeArtwork = useCallback(() => nav.closeArtwork(), [nav])

  const linkTo = (event, action) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    action()
  }

  const enterScene = () => viewMode.set('scene')

  const showNote = note && !noteClosed

  return (
    <div className="g2d">
      <a className="g2d-skip" href="#g2d-main">
        رفتن به محتوای اصلی
      </a>

      <header className="g2d-header">
        <div className="g2d-brand">
          <span className="g2d-mark">آ</span>
          <span className="g2d-brand-text">
            <strong>گالری آریانا</strong>
            <em>ARIANA GALLERY</em>
          </span>
        </div>

        <button
          className="g2d-enter"
          onClick={enterScene}
          onPointerEnter={loadScene3D}
          onFocus={loadScene3D}
          onTouchStart={loadScene3D}
        >
          <span>ورود به گالری سه‌بعدی</span>
          <em className="latin">حجم حدود {SCENE_SIZE}</em>
        </button>
      </header>

      {showNote && (
        <div className="g2d-note" role="status">
          <p>{NOTES[note] || NOTES.error}</p>
          <button onClick={() => setNoteClosed(true)} aria-label="بستن پیام">
            ×
          </button>
        </div>
      )}

      <main id="g2d-main" className="g2d-main">
        <section className="g2d-hero">
          <p className="g2d-kicker">مجموعهٔ دائمی · تهران</p>
          <h1>گالری آریانا</h1>
          <p className="g2d-latin latin">ARIANA CONTEMPORARY GALLERY</p>
          <p className="g2d-lede">
            گالری هنری مجازی؛ سالن اصلی و پنج سالن نمایشگاهی با بیست‌ویک اثر از هنرمندان معاصر ایران. هر اثر
            را می‌توانید در همین صفحه ببینید یا در نمای سه‌بعدی، در سالن‌ها قدم بزنید.
          </p>
        </section>

        <nav className="g2d-hall-nav" aria-label="سالن‌ها">
          {HALL_LIST.map((item) => (
            <a
              key={item.id}
              href={pathForHall(item.id)}
              className={route.hall === item.id ? 'is-active' : undefined}
              aria-current={route.hall === item.id ? 'true' : undefined}
              onClick={(event) => linkTo(event, () => nav.goHall(item.id))}
            >
              {item.id === 'lobby' ? 'سالن اصلی' : item.name}
            </a>
          ))}
        </nav>

        {HALL_LIST.map((item) => {
          const works = artworksOfHall(item.id)
          return (
            <section className="g2d-hall" id={item.id} key={item.id} aria-labelledby={`${item.id}-title`}>
              <header className="g2d-hall-head">
                <p className="g2d-hall-en latin">{item.en}</p>
                <h2 id={`${item.id}-title`}>{item.id === 'lobby' ? 'سالن اصلی' : `${item.name} — ${item.tagline}`}</h2>
                <p className="g2d-hall-meta">
                  {item.tagline} <span>·</span> {faNum(works.length)} اثر
                </p>
              </header>

              <div className="g2d-grid">
                {works.map((art) => (
                  <article className="g2d-card" id={`art-${art.id}`} key={art.id}>
                    <a
                      className="g2d-card-link"
                      href={pathForArtwork(art.hall, art.id)}
                      onClick={(event) => linkTo(event, () => nav.goArtwork(art))}
                    >
                      <span className="g2d-card-frame">
                        <img
                          src={artThumb(art.img)}
                          srcSet={artSrcSet(art.img)}
                          sizes="(max-width: 620px) 46vw, (max-width: 980px) 30vw, 260px"
                          alt={`${art.title} — ${art.artist}`}
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          style={{ aspectRatio: String(art.aspect) }}
                        />
                      </span>
                      <span className="g2d-card-body">
                        <span className="g2d-card-title">{art.title}</span>
                        <span className="g2d-card-artist">{art.artist}</span>
                        <span className="g2d-card-meta">
                          {art.year} <span>·</span> {art.dims}
                        </span>
                        <span className="g2d-card-desc">{art.desc}</span>
                      </span>
                    </a>
                  </article>
                ))}
              </div>
            </section>
          )
        })}
      </main>

      <footer className="g2d-foot">
        <p>گالری آریانا · تهران، خیابان فرشته</p>
        <a href="#g2d-main" onClick={(event) => linkTo(event, () => window.scrollTo({ top: 0, behavior: 'auto' }))}>
          بازگشت به بالای صفحه ↑
        </a>
      </footer>

      {selected && (
        <Lightbox
          art={selected}
          onClose={closeArtwork}
          prevArt={prevArt}
          nextArt={nextArt}
          onPrev={prevArt ? () => nav.goArtwork(prevArt) : null}
          onNext={nextArt ? () => nav.goArtwork(nextArt) : null}
        />
      )}
    </div>
  )
}
