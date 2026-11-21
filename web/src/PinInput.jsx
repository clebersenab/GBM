// Campo de PIN de 4 dígitos: um input numérico com as casas desenhadas por cima.
export default function PinInput({ label, value, onChange, autoFocus }) {
  return (
    <label className="pin">
      <span>{label}</span>
      <div className="pin-box">
        <input
          type="password" inputMode="numeric" autoComplete="off" maxLength={4} autoFocus={autoFocus}
          value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
          aria-label={label}
        />
        <div className="pin-dots" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <i key={i} className={i < value.length ? 'on' : ''} />)}
        </div>
      </div>
    </label>
  )
}
