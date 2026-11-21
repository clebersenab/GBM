import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useSession } from '../session'
import { IMG, FormError, Submit } from '../ui'
import PinInput from '../PinInput'

export const AVATARS = ['raposa', 'leao', 'baleia', 'coruja', 'tartaruga', 'cabra', 'onca', 'papagaio']
const BANDS = [['0-2', '0 a 2 anos'], ['3-5', '3 a 5 anos'], ['6-8', '6 a 8 anos']]

export default function Perfis() {
  const { me, refresh, setProfileId, signOut } = useSession()
  const nav = useNavigate()
  const [modal, setModal] = useState(null) // 'pin' | 'novo'

  const open = (p) => { setProfileId(p.id); nav('/estante') }
  const startAdd = () => setModal(me.parent_unlocked ? 'novo' : 'pin')

  return (
    <main className="perfis">
      <img className="perfis-logo" src={`${IMG}/marca/logo-nav.png`} alt="GBM" />
      <h1>{me.profiles.length ? 'Quem vai ler hoje?' : 'Vamos criar o perfil das crianças'}</h1>
      <div className="who">
        {me.profiles.map((p) => (
          <button key={p.id} onClick={() => open(p)}>
            <img src={`${IMG}/avatares/avatar-${p.avatar}.webp`} alt="" />
            {p.name}
          </button>
        ))}
        {me.profiles.length < 6 && (
          <button onClick={startAdd}>
            <span className="add" aria-hidden="true">+</span>
            Adicionar
          </button>
        )}
      </div>
      <button className="tlink perfis-sair" onClick={async () => { await signOut(); nav('/entrar') }}>Sair da conta</button>

      {modal === 'pin' && <PinGate onClose={() => setModal(null)} onOk={async () => { await refresh(); setModal('novo') }} />}
      {modal === 'novo' && <NovoPerfil onClose={() => setModal(null)} onDone={async () => { await refresh(); setModal(null) }} />}
    </main>
  )
}

export function PinGate({ onClose, onOk }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await api('/parent/unlock', { method: 'POST', body: { pin } })
      onOk()
    } catch (err) {
      setError(err.message); setPin('')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal onClose={onClose} title="Área dos pais">
      <p className="muted">Digite o PIN dos pais para continuar.</p>
      <form onSubmit={submit} className="stack">
        <PinInput label="PIN" value={pin} onChange={setPin} autoFocus />
        <FormError error={error} />
        <Submit busy={busy}>Continuar</Submit>
      </form>
    </Modal>
  )
}

function NovoPerfil({ onClose, onDone }) {
  const [form, setForm] = useState({ name: '', avatar: 'raposa', age_band: '3-5' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await api('/profiles', { method: 'POST', body: { profile: form } })
      onDone()
    } catch (err) {
      setError(err.code === 'pin_required' ? 'O tempo do PIN acabou. Feche e abra de novo.' : err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal onClose={onClose} title="Novo perfil">
      <form onSubmit={submit} className="stack">
        <label className="field">
          <span>Nome ou apelido da criança</span>
          <div className="field-box"><input required maxLength={30} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        </label>
        <fieldset className="avatars">
          <legend>Escolha um bichinho</legend>
          {AVATARS.map((a) => (
            <button type="button" key={a} aria-pressed={form.avatar === a} onClick={() => setForm({ ...form, avatar: a })}>
              <img src={`${IMG}/avatares/avatar-${a}.webp`} alt={a} />
            </button>
          ))}
        </fieldset>
        <fieldset className="bands">
          <legend>Idade</legend>
          {BANDS.map(([v, l]) => (
            <button type="button" key={v} aria-pressed={form.age_band === v} onClick={() => setForm({ ...form, age_band: v })}>{l}</button>
          ))}
        </fieldset>
        <FormError error={error} />
        <Submit busy={busy}>Criar perfil</Submit>
      </form>
    </Modal>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <button className="x" onClick={onClose} aria-label="Fechar">×</button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}
