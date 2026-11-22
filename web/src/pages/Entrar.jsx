import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useSession } from '../session'
import { AuthShell, Field, FormError, Submit, TextLink } from '../ui'

export default function Entrar() {
  const { signIn } = useSession()
  const nav = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const { token, account } = await api('/auth/login', { method: 'POST', body: form })
      signIn(token, account)
      nav('/perfis', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Entrar" subtitle="Que bom ver vocês de novo."
      footer={<>Ainda não tem conta? <TextLink to="/cadastro">Criar conta</TextLink></>}>
      <form onSubmit={submit} className="stack">
        <Field label="E-mail" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        <Field label="Senha" type="password" autoComplete="current-password" required value={form.password} onChange={set('password')} />
        <TextLink to="/esqueci" className="tlink right">Esqueci minha senha</TextLink>
        <FormError error={error} />
        <Submit busy={busy}>Entrar</Submit>
      </form>
    </AuthShell>
  )
}
