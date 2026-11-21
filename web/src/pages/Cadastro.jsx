import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useSession } from '../session'
import { AuthShell, Field, FormError, Submit, TextLink } from '../ui'

export default function Cadastro() {
  const { signIn } = useSession()
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', accept_terms: false, marketing_opt_in: false })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function submit(e) {
    e.preventDefault()
    if (form.password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.')
    if (!form.accept_terms) return setError('Para continuar, aceite os termos de uso e a política de privacidade.')
    setBusy(true); setError(null)
    try {
      const { token, account } = await api('/auth/signup', { method: 'POST', body: form })
      signIn(token, account)
      nav('/pin', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Criar conta" subtitle="A conta é do adulto. Os perfis das crianças você cria logo depois."
      footer={<>Já tem conta? <TextLink to="/entrar">Entrar</TextLink></>}>
      <form onSubmit={submit} className="stack">
        <Field label="Seu nome" autoComplete="name" required value={form.name} onChange={set('name')} />
        <Field label="E-mail" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        <Field label="Senha" type="password" autoComplete="new-password" required minLength={8}
          hint="Pelo menos 8 caracteres." value={form.password} onChange={set('password')} />
        <Field label="WhatsApp (opcional)" type="tel" autoComplete="tel" placeholder="(85) 9 0000-0000"
          hint="Para avisarmos quando as assinaturas abrirem." value={form.phone} onChange={set('phone')} />
        <label className="check">
          <input type="checkbox" checked={form.accept_terms} onChange={set('accept_terms')} />
          <span>Li e aceito os <a href="/termos/" target="_blank" rel="noreferrer">termos de uso</a> e a{' '}
            <a href="/privacidade/" target="_blank" rel="noreferrer">política de privacidade</a>.</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={form.marketing_opt_in} onChange={set('marketing_opt_in')} />
          <span>Quero receber novidades e lançamentos do GBM.</span>
        </label>
        <FormError error={error} />
        <Submit busy={busy}>Criar conta</Submit>
      </form>
    </AuthShell>
  )
}
