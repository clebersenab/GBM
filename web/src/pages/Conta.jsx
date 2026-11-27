import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useSession } from '../session'
import { Card, Icon, PageHead, Segmented, Tag, Toggle } from '../ds'
import { Field, FormError, Submit } from '../ui'
import { avatarImg } from '../catalog'
import { ProfileForm, BANDS } from './Perfis'

export default function Conta() {
  const [params, setParams] = useSearchParams()
  const aba = params.get('aba') || 'dados'
  return (
    <div className="page narrow">
      <PageHead title="Editar perfil" sub="Seus dados de cadastro, a senha e os perfis das crianças" />
      <Segmented label="Seções" value={aba} onChange={(v) => setParams(v === 'dados' ? {} : { aba: v })}
        options={[{ value: 'dados', label: 'Dados da conta' }, { value: 'criancas', label: 'Crianças' }, { value: 'senha', label: 'Senha' }]} />
      {aba === 'dados' && <Dados />}
      {aba === 'criancas' && <Criancas />}
      {aba === 'senha' && <Senha />}
    </div>
  )
}

function Dados() {
  const { me, refresh } = useSession()
  const [form, setForm] = useState({ name: me.name || '', phone: me.phone || '', marketing_opt_in: !!me.marketing_opt_in })
  const [state, setState] = useState({ busy: false, error: null, ok: false })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  async function submit(e) {
    e.preventDefault()
    setState({ busy: true, error: null, ok: false })
    try { await api('/me', { method: 'PATCH', body: form }); await refresh(); setState({ busy: false, error: null, ok: true }) }
    catch (err) { setState({ busy: false, error: err.message, ok: false }) }
  }
  return (
    <Card title="Dados da conta" sub="Preenchidos no cadastro">
      <form className="stack form-2" onSubmit={submit}>
        <Field label="Seu nome" autoComplete="name" required value={form.name} onChange={set('name')} />
        <Field label="E-mail" type="email" value={me.email} disabled hint="Para trocar o e-mail de acesso, fale com a gente." />
        <Field label="WhatsApp" type="tel" autoComplete="tel" placeholder="(85) 9 0000-0000" value={form.phone} onChange={set('phone')} />
        <Toggle checked={form.marketing_opt_in} onChange={(v) => setForm({ ...form, marketing_opt_in: v })}>Quero receber novidades e lançamentos</Toggle>
        <FormError error={state.error} />
        {state.ok && <p className="form-ok">Dados salvos.</p>}
        <div><Submit busy={state.busy}>Salvar alterações</Submit></div>
      </form>
    </Card>
  )
}

function Senha() {
  const [form, setForm] = useState({ current_password: '', password: '' })
  const [state, setState] = useState({ busy: false, error: null, ok: false })
  async function submit(e) {
    e.preventDefault()
    setState({ busy: true, error: null, ok: false })
    try {
      await api('/me/password', { method: 'PATCH', body: form })
      setForm({ current_password: '', password: '' })
      setState({ busy: false, error: null, ok: true })
    } catch (err) { setState({ busy: false, error: err.message, ok: false }) }
  }
  return (
    <Card title="Trocar senha" sub="Os outros aparelhos conectados saem da conta">
      <form className="stack form-2" onSubmit={submit}>
        <Field label="Senha atual" type="password" autoComplete="current-password" required value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
        <Field label="Nova senha" type="password" autoComplete="new-password" required minLength={8} hint="Pelo menos 8 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <FormError error={state.error} />
        {state.ok && <p className="form-ok">Senha trocada.</p>}
        <div><Submit busy={state.busy}>Trocar senha</Submit></div>
      </form>
    </Card>
  )
}

function Criancas() {
  const { me, refresh, profile, setProfileId } = useSession()
  const [edit, setEdit] = useState(null) // perfil ou 'novo'
  async function del(p) {
    if (!window.confirm(`Apagar o perfil de ${p.name}? A estante e o histórico dele somem.`)) return
    await api(`/profiles/${p.id}`, { method: 'DELETE' })
    if (profile?.id === p.id) setProfileId(me.profiles.find((x) => x.id !== p.id)?.id || null)
    await refresh()
  }
  return (
    <Card title="Perfis das crianças" sub="Até 5 perfis. Cada um tem a própria estante e recomendações"
      action={me.profiles.length < 5 && <button className="btn btn-sm btn-main" onClick={() => setEdit('novo')}>+ Adicionar</button>}>
      <ul className="kids">
        {me.profiles.map((p) => (
          <li key={p.id}>
            <img src={avatarImg(p.avatar)} alt="" />
            <div>
              <b>{p.name} {profile?.id === p.id && <Tag tone="green">Lendo agora</Tag>}</b>
              <small>{BANDS.find(([v]) => v === p.age_band)?.[1]}</small>
              {(p.focus_valores.length > 0 || p.focus_caminhos.length > 0) && (
                <span className="kids-f">{[...p.focus_valores, ...p.focus_caminhos].map((x) => <Tag key={x} tone="orange" icon="star">{x}</Tag>)}</span>
              )}
            </div>
            <span className="kids-a">
              <button className="btn btn-sm btn-ghost" onClick={() => setEdit(p)}><Icon name="edit" size={16} />Editar</button>
              <button className="btn btn-sm btn-danger" onClick={() => del(p)} aria-label={`Apagar ${p.name}`}><Icon name="x" size={16} /></button>
            </span>
          </li>
        ))}
      </ul>
      {edit && <ProfileForm profile={edit === 'novo' ? null : edit} onClose={() => setEdit(null)} onDone={async () => { await refresh(); setEdit(null) }} />}
    </Card>
  )
}
