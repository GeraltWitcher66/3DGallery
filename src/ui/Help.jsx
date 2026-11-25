import { useSyncExternalStore } from 'react'
import { quality } from '../lib/quality'
import { useModal } from '../lib/useModal'

const QUALITY_OPTIONS = [
  ['low', 'کم'],
  ['medium', 'متوسط'],
  ['high', 'زیاد'],
  ['auto', 'خودکار'],
]

export default function Help({ onClose }) {
  const dialogRef = useModal(onClose)
  const qualityMode = useSyncExternalStore(quality.subscribe, quality.getMode, quality.getMode)

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="راهنمای گالری">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card" ref={dialogRef}>
        <button className="modal-close" onClick={onClose} aria-label="بستن">
          ×
        </button>
        <p className="modal-kicker">راهنمای گشت</p>
        <h2>در گالری قدم بزنید</h2>

        <div className="help-grid">
          <div className="help-col">
            <h3>دسکتاپ</h3>
            <ul>
              <li>
                <b>W A S D</b> یا کلیدهای جهت‌دار — حرکت
              </li>
              <li>
                <b>ماوس</b> — نگاه (پس از کلیک روی فضا)
              </li>
              <li>
                <b>Shift</b> — حرکت سریع‌تر
              </li>
              <li>
                <b>Esc</b> — خروج از حالت نگاه
              </li>
              <li>
                <b>کلیک روی اثر</b> — نمای بزرگ
              </li>
            </ul>
          </div>
          <div className="help-col">
            <h3>موبایل و لمس</h3>
            <ul>
              <li>
                <b>جوی‌استیک</b> — حرکت در سالن
              </li>
              <li>
                <b>کشیدن انگشت</b> — نگاه
              </li>
              <li>
                <b>ضربه روی اثر</b> — بزرگ‌نمایی و اطلاعات
              </li>
              <li>
                <b>دو انگشت</b> — بزرگ‌نمایی جزئیات
              </li>
            </ul>
          </div>
          <div className="help-col">
            <h3>صفحه‌کلید و دسترس‌پذیری</h3>
            <ul>
              <li>
                <b>Tab</b> — حرکت میان دکمه‌ها
              </li>
              <li>
                <b>فهرست آثار</b> — باز کردن هر اثر بدون ماوس
              </li>
              <li>
                <b>← →</b> — اثر بعدی و قبلی در نمای نزدیک
              </li>
              <li>
                <b>+ − 0</b> — بزرگ‌نمایی، کوچک‌نمایی، بازنشانی
              </li>
            </ul>
          </div>
        </div>

        <div className="help-quality">
          <h3>کیفیت نمایش</h3>
          <div className="quality-row" role="group" aria-label="کیفیت نمایش">
            {QUALITY_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                className={qualityMode === value ? 'is-active' : undefined}
                aria-pressed={qualityMode === value}
                onClick={() => quality.setMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="quality-note">
            در حالت خودکار، کیفیت بر اساس روانی نمایش روی همین دستگاه کم و زیاد می‌شود.
          </p>
        </div>

        <p className="modal-foot">
          سالن فعلی: از نوار بالای صفحه یا دکمهٔ بازگشت، میان سالن‌ها جابه‌جا شوید. هر سالن و هر اثر نشانی
          اختصاصی خود را دارد (<span className="mono">/hall-1</span> و{' '}
          <span className="mono">/hall-1/AR-1402-04</span>).
        </p>
      </div>
    </div>
  )
}
