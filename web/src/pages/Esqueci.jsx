import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useSession } from '../session'
import { AuthShell, Field, FormError, Submit, TextLink } from '../ui'

export default function Esqueci() {
  const { signIn } = useSession()
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ email: '', code: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function sendCode(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await api('/auth/password/forgot', { method: 'POST', body: { email: form.email } })
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function reset(e) {
    e.preventDefault()
    if (form.password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.')
    setBusy(true); setError(null)
    try {
      const { token, account } = await api('/auth/password/reset', { method: 'POST', body: form })
      signIn(token, account)
      nav('/perfis', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (step === 1) {
    return (
      <AuthShell title="Esqueci minha senha" subtitle="Enviamos um código para o seu e-mail."
        footer={<TextLink to="/entrar">Voltar para entrar</TextLink>}>
        <form onSubmit={sendCode} className="stack">
          <Field label="E-mail" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
          <FormError error={error} />
          <Submit busy={busy}>Enviar código</Submit>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Crie uma nova senha" subtitle={`Se ${form.email} tiver cadastro, o código chega em instantes. Ele vale por 30 minutos.`}
      footer={<button type="button" className="tlink" onClick={() => setStep(1)}>Usar outro e-mail</button>}>
      <form onSubmit={reset} className="stack">
        <Field label="Código de 6 dígitos" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required
          value={form.code} onChange={set('code')} />
        <Field label="Nova senha" type="password" autoComplete="new-password" required minLength={8}
          hint="Pelo menos 8 caracteres." value={form.password} onChange={set('password')} />
        <FormError error={error} />
        <Submit busy={busy}>Salvar e entrar</Submit>
      </form>
    </AuthShell>
  )
}
