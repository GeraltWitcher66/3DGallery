export default function Fatal({ title, detail, onRetry }) {
  return (
    <div className="fatal" role="alert">
      <p className="fatal-mark latin">ARIANA</p>
      <h1>{title}</h1>
      {detail && <p className="fatal-detail">{detail}</p>}
      {onRetry && (
        <button className="btn-gold" onClick={onRetry}>
          تلاش دوباره
        </button>
      )}
    </div>
  )
}
