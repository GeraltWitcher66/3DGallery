import { HALL_LIST } from '../data/gallery'

export default function Hud({ hall, onNavigate, isTouch, locked, showHint, onHelp, onHome }) {
  return (
    <div className="hud">
      <header className="hud-top">
        <button className="brand" onClick={onHome} aria-label="بازگشت به سالن اصلی">
          <span className="brand-mark">آ</span>
          <span className="brand-text">
            <strong>گالری آریانا</strong>
            <em>ARIANA GALLERY</em>
          </span>
        </button>

        <nav className="hud-nav" aria-label="سالن‌ها">
          {HALL_LIST.map((h) => (
            <button
              key={h.id}
              className={`nav-pill${hall.id === h.id ? ' is-active' : ''}`}
              onClick={() => onNavigate(h.id)}
            >
              {h.id === 'lobby' ? 'لابی' : h.name}
            </button>
          ))}
        </nav>

        <div className="hud-actions">
          <button className="ghost-btn" onClick={onHelp}>
            راهنما
          </button>
        </div>
      </header>

      <div className="hud-bottom">
        <div className="hud-hint">
          {showHint && !isTouch && (
            <span className="hint-chip">
              {locked ? 'با ماوس نگاه کنید · Esc برای خروج' : 'برای نگاه با ماوس، روی فضا کلیک کنید'}
            </span>
          )}
          {showHint && isTouch && <span className="hint-chip">جوی‌استیک: حرکت · کشیدن انگشت: نگاه</span>}
        </div>

        <div className="hud-current">
          <p className="hud-current-label">{hall.en}</p>
          <h2>{hall.id === 'lobby' ? 'سالن اصلی' : `${hall.name} — ${hall.tagline}`}</h2>
          {hall.id !== 'lobby' && (
            <button className="link-back" onClick={onHome}>
              <span>→</span> بازگشت به سالن اصلی
            </button>
          )}
        </div>
      </div>

      <nav className="hud-mobile-nav" aria-label="سالن‌ها">
        {HALL_LIST.map((h) => (
          <button
            key={h.id}
            className={`nav-pill${hall.id === h.id ? ' is-active' : ''}`}
            onClick={() => onNavigate(h.id)}
          >
            {h.id === 'lobby' ? 'لابی' : h.name}
          </button>
        ))}
      </nav>
    </div>
  )
}
