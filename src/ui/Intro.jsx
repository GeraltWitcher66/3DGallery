import { HALL_LIST } from '../data/gallery'

export default function Intro({ onEnter, onNavigate, progress, ready }) {
  return (
    <div className="intro">
      <div className="intro-bg" />
      <div className="intro-veil" />

      <div className="intro-top">
        <span className="intro-est">EST. ۱۳۹۴</span>
        <span className="intro-est latin">TEHRAN</span>
      </div>

      <div className="intro-body">
        <p className="intro-kicker">مجموعهٔ دائمی · نسخهٔ سه‌بعدی</p>
        <h1 className="intro-title">گالری آریانا</h1>
        <p className="intro-latin">ARIANA CONTEMPORARY GALLERY</p>
        <p className="intro-copy">
          شش فضا و بیست‌ویک اثر از هنرمندان معاصر ایران. در سالن‌ها آزادانه قدم بزنید، به آثار نزدیک شوید و
          جزئیات را با ذره‌بین ببینید.
        </p>

        <button className="btn-gold" onClick={onEnter} disabled={!ready}>
          ورود به گالری
          <span className="btn-arrow">←</span>
        </button>

        <div className="intro-halls">
          {HALL_LIST.map((h) => (
            <button key={h.id} onClick={() => onNavigate(h.id)} className="intro-hall">
              <span className="intro-hall-name">{h.id === 'lobby' ? 'سالن اصلی' : h.name}</span>
              <span className="intro-hall-tag">{h.tagline}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="intro-foot">
        <div className="intro-keys">
          <span><b>W A S D</b> حرکت</span>
          <span><b>ماوس</b> نگاه</span>
          <span><b>موبایل</b> جوی‌استیک و کشیدن</span>
        </div>
        <div className="intro-progress">
          <div className="intro-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}
