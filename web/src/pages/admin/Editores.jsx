// Equipe: quem administra e quem edita histórias. A pessoa cria a conta no GBM antes;
// depois o admin informa o e-mail aqui.
import { useEffect, useState } from 'react'
import { api } from '../../api'
import { Icon } from '../../ds'

const TIPOS = {
  admins: {
    titulo: 'Administradores',
    texto: 'Criam histórias, revisam, publicam e cuidam da equipe. Use também para a conta do assistente que cadastra histórias por você.',
    botao: 'Adicionar administrador',
    remover: (x) => `Tirar ${x.email} dos administradores?`,
    detalhe: (x) => (x.voce ? 'você' : 'administrador'),
  },
  editors: {
    titulo: 'Editores',
    texto: 'Completam páginas, quiz e palavras novas das histórias que você enviar para eles.',
    botao: 'Adicionar editor',
    remover: (x) => `Tirar ${x.email} dos editores? As histórias em edição com essa pessoa voltam para rascunho.`,
    detalhe: (x) => `${x.titles} ${x.titles === 1 ? 'história em andamento' : 'histórias em andamento'}`,
  },
}

function Grupo({ tipo }) {
  const t = TIPOS[tipo]
  const [lista, setLista] = useState(null)
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const carregar = () => api(`/admin/${tipo}`).then(setLista).catch((e) => setMsg({ ok: false, text: e.message }))
  useEffect(() => { carregar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function adicionar(e) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try { await api(`/admin/${tipo}`, { method: 'POST', body: { email } }); setEmail(''); setMsg({ ok: true, text: 'Adicionado.' }); carregar() }
    catch (err) { setMsg({ ok: false, text: err.message }) } finally { setBusy(false) }
  }
  async function remover(x) {
    if (!window.confirm(t.remover(x))) return
    try { await api(`/admin/${tipo}/${x.id}`, { method: 'DELETE' }); carregar() } catch (err) { setMsg({ ok: false, text: err.message }) }
  }

  return (
    <section className="ad-sec">
      <h2>{t.titulo}</h2>
      <p className="muted sm">{t.texto}</p>
      <form className="ad-add" onSubmit={adicionar}>
        <label className="ad-campo g3"><span>E-mail da conta</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@exemplo.com" /></label>
        <button className="btn btn-main" disabled={busy}>{busy ? 'Adicionando…' : t.botao}</button>
      </form>
      {msg && <p className={msg.ok ? 'form-ok' : 'form-error'}>{msg.text}</p>}
      {lista && lista.length === 0 && <p className="muted">Ninguém ainda.</p>}
      <ul className="ad-lista">
        {lista?.map((x) => (
          <li key={x.id}><div className="ad-li-row">
            <span className="ad-semcapa"><Icon name="user" /></span>
            <span className="ad-li-main"><b>{x.name || x.email}</b><small>{x.email} · {t.detalhe(x)}</small></span>
            {!x.voce && <button className="tlink sm" onClick={() => remover(x)}>Remover</button>}
          </div></li>
        ))}
      </ul>
    </section>
  )
}

export default function Equipe() {
  return (
    <div className="ad-form">
      <div className="ad-head"><div>
        <h1>Equipe</h1>
        <p className="muted">A pessoa precisa criar a conta no GBM antes; depois é só informar o e-mail aqui.</p>
      </div></div>
      <Grupo tipo="admins" />
      <Grupo tipo="editors" />
    </div>
  )
}
