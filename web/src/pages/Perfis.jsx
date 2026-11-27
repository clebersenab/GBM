import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useSession } from '../session'
import { FormError, Submit } from '../ui'
import { Modal } from '../ds'
import { CAMINHOS, VALORES, avatarImg } from '../catalog'
import { Logo, ThemeToggle } from '../theme'

export const AVATARS = ['raposa', 'leao', 'baleia', 'coruja', 'tartaruga', 'cabra', 'onca', 'papagaio']
export const BANDS = [['0-2', '0 a 2 anos'], ['3-5', '3 a 5 anos'], ['6-8', '6 a 8 anos']]

export default function Perfis() {
  const { me, refresh, setProfileId, signOut } = useSession()
  const nav = useNavigate()
  const [novo, setNovo] = useState(false)

  const open = (p) => { setProfileId(p.id); nav('/inicio') }

  return (
    <main className="perfis">
      <div className="corner"><ThemeToggle /></div>
      <Logo className="perfis-logo" />
      <h1>{me.profiles.length ? 'Quem vai ler hoje?' : 'Vamos criar o perfil das crianças'}</h1>
      <div className="who">
        {me.profiles.map((p) => (
          <button key={p.id} onClick={() => open(p)}>
            <img src={avatarImg(p.avatar)} alt="" />
            {p.name}
          </button>
        ))}
        {me.profiles.length < 5 && (
          <button onClick={() => setNovo(true)}>
            <span className="add" aria-hidden="true">+</span>
            Adicionar
          </button>
        )}
      </div>
      <div className="perfis-foot">
        {me.profiles.length > 0 && <Link className="tlink" to="/conta?aba=criancas" onClick={() => setProfileId(me.profiles[0].id)}>Gerenciar perfis</Link>}
        {(me.admin || me.editor) && <Link className="tlink" to="/admin">{me.admin ? "Administração" : "Edição de histórias"}</Link>}
        <button className="tlink perfis-sair" onClick={async () => { await signOut(); nav('/entrar') }}>Sair da conta</button>
      </div>
      {novo && <ProfileForm onClose={() => setNovo(false)} onDone={async (p) => { await refresh(); setNovo(false); if (!me.profiles.length) open(p) }} />}
    </main>
  )
}

// Criar ou editar perfil de criança, com o foco que os pais querem trabalhar.
export function ProfileForm({ profile, onClose, onDone }) {
  const [form, setForm] = useState({
    name: profile?.name || '', avatar: profile?.avatar || 'raposa', age_band: profile?.age_band || '3-5',
    focus_valores: profile?.focus_valores || [], focus_caminhos: profile?.focus_caminhos || [],
  })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const flip = (k, x) => {
    const cur = form[k]
    if (!cur.includes(x) && cur.length >= 5) { setError('Escolha até 5 em cada grupo.'); return }
    setError(null)
    setForm({ ...form, [k]: cur.includes(x) ? cur.filter((y) => y !== x) : [...cur, x] })
  }
  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const saved = profile
        ? await api(`/profiles/${profile.id}`, { method: 'PATCH', body: { profile: form } })
        : await api('/profiles', { method: 'POST', body: { profile: form } })
      onDone(saved)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }
  return (
    <Modal onClose={onClose} title={profile ? `Editar ${profile.name}` : 'Novo perfil'}>
      <form onSubmit={submit} className="stack">
        <label className="field">
          <span>Nome ou apelido da criança</span>
          <div className="field-box"><input required maxLength={30} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        </label>
        <fieldset className="avatars">
          <legend>Escolha um bichinho</legend>
          {AVATARS.map((a) => (
            <button type="button" key={a} aria-pressed={form.avatar === a} onClick={() => setForm({ ...form, avatar: a })}>
              <img src={avatarImg(a)} alt={a} />
            </button>
          ))}
        </fieldset>
        <fieldset className="bands">
          <legend>Idade</legend>
          {BANDS.map(([v, l]) => (
            <button type="button" key={v} aria-pressed={form.age_band === v} onClick={() => setForm({ ...form, age_band: v })}>{l}</button>
          ))}
        </fieldset>
        <fieldset className="bands focus">
          <legend>Valores para cultivar <small>(até 5, opcional)</small></legend>
          {VALORES.map((v) => <button type="button" key={v} aria-pressed={form.focus_valores.includes(v)} onClick={() => flip('focus_valores', v)}>{v}</button>)}
        </fieldset>
        <fieldset className="bands focus j">
          <legend>Jornadas para apresentar <small>(até 5, opcional)</small></legend>
          {CAMINHOS.map((c) => <button type="button" key={c} aria-pressed={form.focus_caminhos.includes(c)} onClick={() => flip('focus_caminhos', c)}>{c}</button>)}
        </fieldset>
        <FormError error={error} />
        <Submit busy={busy}>{profile ? 'Salvar' : 'Criar perfil'}</Submit>
      </form>
    </Modal>
  )
}
