// O admin escolhe quem pode editar histórias. A pessoa cria a conta antes, como qualquer família.
import { useEffect, useState } from 'react'
import { api } from '../../api'
import { Icon } from '../../ds'

export default function Editores() {
  const [lista, setLista] = useState(null)
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const carregar = () => api('/admin/editors').then(setLista).catch((e) => setMsg({ ok: false, text: e.message }))
  useEffect(() => { carregar() }, [])

  async function adicionar(e) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try { await api('/admin/editors', { method: 'POST', body: { email } }); setEmail(''); setMsg({ ok: true, text: 'Editor adicionado.' }); carregar() }
    catch (err) { setMsg({ ok: false, text: err.message }) } finally { setBusy(false) }
  }
  async function remover(x) {
    if (!window.confirm(`Tirar ${x.email} dos editores? As histórias em edição com essa pessoa voltam para rascunho.`)) return
    try { await api(`/admin/editors/${x.id}`, { method: 'DELETE' }); carregar() } catch (err) { setMsg({ ok: false, text: err.message }) }
  }

  return (
    <div className="ad-form">
      <div className="ad-head"><div>
        <h1>Editores</h1>
        <p className="muted">Quem completa as páginas e o quiz das histórias. A pessoa precisa criar a conta no GBM antes; depois é só informar o e-mail aqui.</p>
      </div></div>
      <form className="ad-sec ad-add" onSubmit={adicionar}>
        <label className="ad-campo g3"><span>E-mail da conta</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="editora@exemplo.com" /></label>
        <button className="btn btn-main" disabled={busy}>{busy ? 'Adicionando…' : 'Adicionar editor'}</button>
      </form>
      {msg && <p className={msg.ok ? 'form-ok' : 'form-error'}>{msg.text}</p>}
      {lista && lista.length === 0 && <p className="muted">Nenhum editor ainda.</p>}
      <ul className="ad-lista">
        {lista?.map((x) => (
          <li key={x.id}><div className="ad-li-row">
            <span className="ad-semcapa"><Icon name="user" /></span>
            <span className="ad-li-main"><b>{x.name || x.email}</b><small>{x.email} · {x.titles} {x.titles === 1 ? 'história em andamento' : 'histórias em andamento'}</small></span>
            <button className="tlink sm" onClick={() => remover(x)}>Remover</button>
          </div></li>
        ))}
      </ul>
    </div>
  )
}
