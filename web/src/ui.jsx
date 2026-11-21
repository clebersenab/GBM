import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo, ThemeToggle } from './theme'

export const IMG = '/images'

export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <main className="auth">
      <div className="corner"><ThemeToggle /></div>
      <a href="/" className="auth-logo" aria-label="GBM, voltar ao site">
        <Logo />
      </a>
      <section className="auth-card">
        <h1>{title}</h1>
        {subtitle && <p className="auth-sub">{subtitle}</p>}
        {children}
      </section>
      {footer && <p className="auth-foot">{footer}</p>}
    </main>
  )
}

export function Field({ label, hint, error, ...props }) {
  const [show, setShow] = useState(false)
  const isPassword = props.type === 'password'
  return (
    <label className="field">
      <span>{label}</span>
      <div className="field-box">
        <input {...props} type={isPassword && show ? 'text' : props.type} />
        {isPassword && (
          <button type="button" className="eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Esconder senha' : 'Mostrar senha'}>
            {show ? 'Esconder' : 'Mostrar'}
          </button>
        )}
      </div>
      {hint && !error && <small>{hint}</small>}
    </label>
  )
}

export function FormError({ error }) {
  if (!error) return null
  return <p className="form-error" role="alert">{error}</p>
}

export function Submit({ busy, children }) {
  return (
    <button className="btn btn-main" type="submit" disabled={busy}>
      {busy ? 'Aguarde…' : children}
    </button>
  )
}

export const TextLink = (props) => <Link className="tlink" {...props} />
