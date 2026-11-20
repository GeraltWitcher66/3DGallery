export default function Help({ onClose }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="راهنمای گالری">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="بستن">
          ×
        </button>
        <p className="modal-kicker">راهنمای گشت</p>
        <h2>در گالری قدم بزنید</h2>

        <div className="help-grid">
          <div className="help-col">
            <h3>دسکتاپ</h3>
            <ul>
              <li><b>W A S D</b> یا کلیدهای جهت‌دار — حرکت</li>
              <li><b>ماوس</b> — نگاه (پس از کلیک روی فضا)</li>
              <li><b>Shift</b> — حرکت سریع‌تر</li>
              <li><b>Esc</b> — خروج از حالت نگاه</li>
              <li><b>حرکت ماوس روی اثر</b> — ذره‌بین</li>
            </ul>
          </div>
          <div className="help-col">
            <h3>موبایل و لمس</h3>
            <ul>
              <li><b>جوی‌استیک</b> — حرکت در سالن</li>
              <li><b>کشیدن انگشت</b> — نگاه</li>
              <li><b>ضربه روی اثر</b> — بزرگ‌نمایی و اطلاعات</li>
              <li><b>دو انگشت</b> — بزرگ‌نمایی جزئیات</li>
            </ul>
          </div>
        </div>

        <p className="modal-foot">
          سالن فعلی: از نوار بالای صفحه یا دکمهٔ بازگشت، میان سالن‌ها جابه‌جا شوید. هر سالن نشانی
          اختصاصی خود را دارد (<span className="mono">/hall-1</span> تا <span className="mono">/hall-5</span>).
        </p>
      </div>
    </div>
  )
}
