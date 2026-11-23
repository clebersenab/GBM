// Cadastro de uma história.
//   Admin: dados da história (título, capa, obra semente, valores, jornadas, organização) e o fluxo.
//   Editor: páginas (imagem, texto, pergunta para os pais), quiz e palavras novas, enquanto está em edição.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import { useSession } from '../../session'
import { Icon } from '../../ds'
import { CAMINHOS, CATEGORIAS, GRUPOS_TODOS, VALORES, atualizarCatalogo } from '../../catalog'
import { Escolha, ImagemUpload, StatusChip, enviarImagem } from './comum'

const VAZIA = {
  titulo: '', sinopse: '', capa: null, cover_image_id: null, obra_mae: { titulo: '', autor: '', tipo: 'livro', idade: '' },
  valores: [], caminhos: [], fileiras: [], colecoes: [], box: '', volume: '', lancamento: false, mostrar_em_breve: false, editor: null,
  status: 'rascunho', quiz: [], vocabulario: [], pages: [],
}
const urlDe = (u) => (!u ? null : /^https?:/.test(u) ? u : '/' + u)
const palavras = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length
const novaPergunta = () => ({ pergunta: '', opcoes: ['', '', ''], certa: 0, explica: '' })

export default function Historia() {
  const { id } = useParams()
  const nova = id === 'nova'
  const nav = useNavigate()
  const { me } = useSession()
  const admin = me.admin
  const [h, setH] = useState(nova ? VAZIA : null)
  const [salvo, setSalvo] = useState(nova ? JSON.stringify(VAZIA) : null)
  const [editores, setEditores] = useState([])
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(null)
  const [nota, setNota] = useState('')
  const [devolver, setDevolver] = useState(false)

  useEffect(() => {
    if (admin) api('/admin/editors').then(setEditores).catch(() => {})
    if (nova) return
    api(`/admin/titles/${id}`).then((t) => {
      const v = { ...VAZIA, ...t, obra_mae: { ...VAZIA.obra_mae, ...(t.obra_mae || {}) }, box: t.box || '', volume: t.volume ?? '' }
      setH(v); setSalvo(JSON.stringify(v))
    }).catch((e) => setMsg({ ok: false, text: e.message }))
  }, [id, nova, admin])

  const sujo = h && salvo !== JSON.stringify(h)
  useEffect(() => {
    if (!sujo) return
    const aviso = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [sujo])

  const boxes = useMemo(() => GRUPOS_TODOS.filter((g) => g.tipo === 'box').map((g) => ({ id: g.id, nome: g.titulo })), [])
  const colecoes = useMemo(() => GRUPOS_TODOS.filter((g) => g.tipo !== 'box').map((g) => ({ id: g.id, nome: g.titulo })), [])

  if (!h) return msg ? <p className="form-error">{msg.text}</p> : <p className="muted">Carregando…</p>

  const comEditor = !admin && h.status === 'em_edicao' && h.editor?.id === me.id
  const podeConteudo = admin || comEditor
  const set = (patch) => setH((x) => ({ ...x, ...patch }))
  const setObra = (patch) => setH((x) => ({ ...x, obra_mae: { ...x.obra_mae, ...patch } }))

  function payload() {
    const conteudo = {
      quiz: h.quiz.map((q) => ({ ...q, opcoes: q.opcoes.filter((o, i) => o.trim() || i < 2) })),
      vocabulario: h.vocabulario.filter((v) => v.palavra.trim() || v.significado.trim()),
      pages: h.pages.map((p) => ({ image_id: p.image_id, image_path: p.image_id ? null : p.image_path, text: p.text, parent_question: p.parent_question })),
    }
    if (!admin) return conteudo
    return {
      ...conteudo, title: h.titulo, sinopse: h.sinopse, cover_image_id: h.cover_image_id, obra_mae: h.obra_mae,
      valores: h.valores, caminhos: h.caminhos, fileiras: h.fileiras, colecoes: h.colecoes, box: h.box || null,
      volume: h.box ? h.volume || null : null, lancamento: h.lancamento, mostrar_em_breve: h.mostrar_em_breve, editor_id: h.editor?.id || null,
    }
  }

  async function salvar({ calado } = {}) {
    setBusy('salvar'); setMsg(null)
    try {
      if (nova) {
        if (!h.titulo.trim()) throw new Error('Dê um título para a história.')
        const t = await api('/admin/titles', { method: 'POST', body: payload() })
        setSalvo(JSON.stringify(h))
        nav(`/admin/historia/${t.db_id}`, { replace: true })
        return t
      }
      const t = await api(`/admin/titles/${id}`, { method: 'PATCH', body: payload() })
      const v = { ...h, ...t, obra_mae: { ...VAZIA.obra_mae, ...(t.obra_mae || {}) }, box: t.box || '', volume: t.volume ?? '' }
      setH(v); setSalvo(JSON.stringify(v))
      if (!calado) setMsg({ ok: true, text: 'Alterações salvas.' })
      return t
    } catch (err) { setMsg({ ok: false, text: err.message }); return null } finally { setBusy(null) }
  }

  async function mover(to, texto) {
    if (sujo && !(await salvar({ calado: true }))) return
    const from = h.status
    setBusy(to); setMsg(null)
    try {
      const t = await api(`/admin/titles/${id}/transition`, { method: 'POST', body: { to, note: nota } })
      const v = { ...h, ...t, obra_mae: { ...VAZIA.obra_mae, ...(t.obra_mae || {}) }, box: t.box || '', volume: t.volume ?? '' }
      setH(v); setSalvo(JSON.stringify(v)); setDevolver(false); setNota('')
      setMsg({ ok: true, text: texto })
      if (to === 'publicado' || from === 'publicado') atualizarCatalogo().catch(() => {})
    } catch (err) { setMsg({ ok: false, text: err.message }) } finally { setBusy(null) }
  }

  async function previa() {
    if (sujo && !(await salvar({ calado: true }))) return
    try {
      const book = await api(`/admin/titles/${id}/preview`)
      if (!book.paginas) return setMsg({ ok: false, text: 'Cadastre pelo menos uma página para pré-visualizar.' })
      nav(`/previa/${book.slug}`, { state: { book } })
    } catch (err) { setMsg({ ok: false, text: err.message }) }
  }

  async function apagar() {
    if (!window.confirm(`Apagar “${h.titulo}”? Isso não pode ser desfeito.`)) return
    try { await api(`/admin/titles/${id}`, { method: 'DELETE' }); nav('/admin') } catch (err) { setMsg({ ok: false, text: err.message }) }
  }

  // Páginas
  const setPag = (i, patch) => set({ pages: h.pages.map((p, k) => (k === i ? { ...p, ...patch } : p)) })
  const moverPag = (i, d) => { const l = [...h.pages]; [l[i], l[i + d]] = [l[i + d], l[i]]; set({ pages: l }) }
  async function variasImagens(e) {
    const files = [...(e.target.files || [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    e.target.value = ''
    if (!files.length) return
    setBusy('imgs'); setMsg(null)
    try {
      const novas = []
      for (const f of files) {
        const img = await enviarImagem(f)
        novas.push({ image_id: img.id, image_url: img.url, text: '', parent_question: '' })
      }
      setH((x) => ({ ...x, pages: [...x.pages, ...novas] }))
    } catch (err) { setMsg({ ok: false, text: err.message }) } finally { setBusy(null) }
  }

  const totalPalavras = h.pages.reduce((s, p) => s + palavras(p.text), 0)
  const acoes = []
  if (!nova && admin) {
    if (h.status === 'rascunho') acoes.push(['em_edicao', h.editor ? `Enviar para ${h.editor.name || h.editor.email}` : 'Enviar para o editor', 'A história foi para o editor.', 'main'])
    if (h.status === 'em_edicao') acoes.push(['rascunho', 'Voltar para rascunho', 'A história voltou para rascunho.'])
    if (h.status === 'em_revisao') acoes.push(['devolver', 'Devolver ao editor', ''])
    if (h.status !== 'publicado') acoes.push(['publicado', 'Publicar', 'Publicada: já aparece para as famílias.', h.status === 'em_revisao' ? 'main' : ''])
    if (h.status === 'publicado') acoes.push(['rascunho', 'Despublicar', 'A história saiu do catálogo e voltou para rascunho.'])
  }
  if (comEditor) acoes.push(['em_revisao', 'Enviar para revisão', 'Enviada para o administrador revisar.', 'main'])

  return (
    <div className="ad-form">
      <div className="ad-crumbs"><Link to="/admin"><Icon name="chev" size={16} />Histórias</Link></div>
      <div className="ad-head">
        <div>
          <h1>{nova ? 'Nova história' : h.titulo || 'Sem título'}</h1>
          {!nova && <p className="ad-meta"><StatusChip s={h.status} />{h.editor && <span>Editor: {h.editor.name || h.editor.email}</span>}<span>{h.pages.length} páginas · {totalPalavras} palavras</span></p>}
        </div>
        <div className="ad-acoes">
          {!nova && <button className="btn btn-ghost btn-sm" onClick={previa}><Icon name="play" size={16} />Pré-visualizar</button>}
          {acoes.map(([to, label, texto, tipo]) => (
            <button key={to + label} className={`btn btn-sm ${tipo === 'main' ? 'btn-main' : 'btn-ghost'}`} disabled={!!busy}
              onClick={() => (to === 'devolver' ? setDevolver(true) : mover(to, texto))}>{busy === to ? 'Aguarde…' : label}</button>
          ))}
        </div>
      </div>

      {h.review_note && h.status === 'em_edicao' && <div className="ad-nota"><b>Observação da revisão</b><p>{h.review_note}</p></div>}
      {!admin && !comEditor && <div className="ad-nota"><p>{h.status === 'em_revisao' ? 'Em revisão pelo administrador. Você poderá editar de novo se ela voltar.' : 'Esta história não está em edição com você no momento.'}</p></div>}
      {devolver && (
        <div className="ad-nota ad-devolver">
          <b>O que precisa ser ajustado?</b>
          <textarea rows={3} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex.: a página 4 está longa demais; a pergunta da página 7 está fechada." />
          <div className="ad-acoes">
            <button className="btn btn-main btn-sm" disabled={!nota.trim() || !!busy} onClick={() => mover('em_edicao', 'Devolvida ao editor com a observação.')}>Devolver</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setDevolver(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <section className="ad-sec">
        <h2>Dados da história {!admin && <small>preenchidos pelo administrador</small>}</h2>
        <div className="ad-dados">
          <div>
            <span className="ad-lbl">Capa</span>
            <ImagemUpload className="capa" url={urlDe(h.capa)} disabled={!admin} max={1200} label="Enviar capa"
              onChange={(img) => set({ cover_image_id: img.id, capa: img.url })} />
          </div>
          <div className="ad-campos">
            <label className="ad-campo"><span>Título</span><input value={h.titulo} disabled={!admin} onChange={(e) => set({ titulo: e.target.value })} /></label>
            <label className="ad-campo"><span>Sinopse</span><textarea rows={3} value={h.sinopse} disabled={!admin} onChange={(e) => set({ sinopse: e.target.value })} placeholder="Uma ou duas frases para o cartão do livro." /></label>
            <fieldset className="ad-grupo">
              <legend>Obra semente</legend>
              <div className="ad-linha">
                <label className="ad-campo g2"><span>Título da obra</span><input value={h.obra_mae.titulo} disabled={!admin} onChange={(e) => setObra({ titulo: e.target.value })} placeholder="Moby Dick" /></label>
                <label className="ad-campo g2"><span>Autor</span><input value={h.obra_mae.autor} disabled={!admin} onChange={(e) => setObra({ autor: e.target.value })} placeholder="Herman Melville" /></label>
                <label className="ad-campo"><span>Tipo</span>
                  <select value={h.obra_mae.tipo} disabled={!admin} onChange={(e) => setObra({ tipo: e.target.value })}>
                    <option value="livro">Livro</option><option value="filme">Filme</option><option value="serie">Série</option>
                  </select></label>
                <label className="ad-campo"><span>Idade</span><input value={h.obra_mae.idade} disabled={!admin} onChange={(e) => setObra({ idade: e.target.value })} placeholder="14+" /></label>
              </div>
            </fieldset>
            <div className="ad-campo"><span>Valores</span><Escolha cor="v" opcoes={VALORES} valor={h.valores} disabled={!admin} onChange={(valores) => set({ valores })} /></div>
            <div className="ad-campo"><span>Jornadas</span><Escolha cor="j" opcoes={CAMINHOS} valor={h.caminhos} disabled={!admin} onChange={(caminhos) => set({ caminhos })} /></div>
            {admin && (
              <details className="ad-grupo" open={nova || undefined}>
                <summary>Organização no catálogo</summary>
                <div className="ad-campo"><span>Categorias</span><Escolha opcoes={CATEGORIAS} valor={h.fileiras} onChange={(fileiras) => set({ fileiras })} /></div>
                <div className="ad-linha">
                  <label className="ad-campo g2"><span>Box</span>
                    <select value={h.box} onChange={(e) => set({ box: e.target.value })}>
                      <option value="">Não faz parte de um box</option>
                      {boxes.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
                    </select></label>
                  {h.box && <label className="ad-campo"><span>Volume</span><input type="number" min="1" value={h.volume} onChange={(e) => set({ volume: e.target.value })} /></label>}
                </div>
                <div className="ad-campo"><span>Coleções</span><Escolha opcoes={colecoes} valor={h.colecoes} onChange={(c) => set({ colecoes: c })} /></div>
                <label className="ad-check"><input type="checkbox" checked={h.lancamento} onChange={(e) => set({ lancamento: e.target.checked })} />Mostrar em Lançamentos</label>
                {h.status !== 'publicado' && <label className="ad-check"><input type="checkbox" checked={h.mostrar_em_breve} onChange={(e) => set({ mostrar_em_breve: e.target.checked })} />Mostrar no catálogo como “Em breve” enquanto não é publicada</label>}
              </details>
            )}
            {admin && (
              <label className="ad-campo"><span>Editor responsável</span>
                <select value={h.editor?.id || ''} onChange={(e) => set({ editor: editores.find((x) => String(x.id) === e.target.value) || null })}>
                  <option value="">Ninguém ainda</option>
                  {editores.map((x) => <option key={x.id} value={x.id}>{x.name ? `${x.name} (${x.email})` : x.email}</option>)}
                </select>
                {editores.length === 0 && <small>Nenhum editor cadastrado. <Link to="/admin/equipe">Cadastrar editores</Link></small>}
              </label>
            )}
          </div>
        </div>
      </section>

      {!nova && (
        <>
          <section className="ad-sec">
            <div className="ad-sec-head">
              <h2>Páginas <small>{h.pages.length} de 12 a 16 · {totalPalavras} palavras, ideal entre 500 e 900</small></h2>
              {podeConteudo && (
                <label className={`btn btn-ghost btn-sm ${busy === 'imgs' ? 'is-busy' : ''}`}>
                  <Icon name="download" size={16} />{busy === 'imgs' ? 'Enviando…' : 'Várias imagens de uma vez'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={variasImagens} disabled={!!busy} />
                </label>
              )}
            </div>
            {h.pages.length === 0 && <p className="muted">Nenhuma página. Envie as ilustrações de uma vez (na ordem do nome do arquivo) ou adicione uma por uma.</p>}
            <ol className="ad-paginas">
              {h.pages.map((p, i) => (
                <li key={i} className="ad-pag">
                  <div className="ad-pag-n">
                    <b>{i + 1}</b>
                    {podeConteudo && <>
                      <button type="button" onClick={() => moverPag(i, -1)} disabled={i === 0} aria-label="Subir página">↑</button>
                      <button type="button" onClick={() => moverPag(i, 1)} disabled={i === h.pages.length - 1} aria-label="Descer página">↓</button>
                      <button type="button" onClick={() => set({ pages: h.pages.filter((_, k) => k !== i) })} aria-label="Remover página"><Icon name="x" size={16} /></button>
                    </>}
                  </div>
                  <ImagemUpload url={urlDe(p.image_url)} disabled={!podeConteudo} onChange={(img) => setPag(i, { image_id: img.id, image_url: img.url })} />
                  <div className="ad-campos">
                    <label className="ad-campo"><span>Texto <small>{palavras(p.text)} palavras</small></span>
                      <textarea rows={4} value={p.text} disabled={!podeConteudo} onChange={(e) => setPag(i, { text: e.target.value })} /></label>
                    <label className="ad-campo"><span>Pergunta para os pais <small>opcional</small></span>
                      <input value={p.parent_question || ''} disabled={!podeConteudo} onChange={(e) => setPag(i, { parent_question: e.target.value })} placeholder="Pergunta aberta, ligada à página. Ex.: o que você faria no lugar dele?" /></label>
                  </div>
                </li>
              ))}
            </ol>
            {podeConteudo && <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ pages: [...h.pages, { image_id: null, image_url: null, text: '', parent_question: '' }] })}>+ Adicionar página</button>}
          </section>

          <section className="ad-sec">
            <h2>Quiz <small>perguntas para o fim do livro; 3 a 5 é um bom número</small></h2>
            <ol className="ad-quiz">
              {h.quiz.map((q, i) => {
                const setQ = (patch) => set({ quiz: h.quiz.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
                return (
                  <li key={i}>
                    <div className="ad-sec-head">
                      <label className="ad-campo g2"><span>Pergunta {i + 1}</span><input value={q.pergunta} disabled={!podeConteudo} onChange={(e) => setQ({ pergunta: e.target.value })} /></label>
                      {podeConteudo && <button type="button" className="tlink sm" onClick={() => set({ quiz: h.quiz.filter((_, k) => k !== i) })}>Remover</button>}
                    </div>
                    <div className="ad-opcoes">
                      {q.opcoes.map((o, n) => (
                        <label key={n} className={q.certa === n ? 'certa' : ''}>
                          <input type="radio" name={`certa-${i}`} checked={q.certa === n} disabled={!podeConteudo} onChange={() => setQ({ certa: n })} title="Resposta certa" />
                          <input value={o} disabled={!podeConteudo} placeholder={`Opção ${n + 1}`} onChange={(e) => setQ({ opcoes: q.opcoes.map((x, k) => (k === n ? e.target.value : x)) })} />
                          {podeConteudo && q.opcoes.length > 2 && <button type="button" aria-label="Tirar opção" onClick={() => setQ({ opcoes: q.opcoes.filter((_, k) => k !== n), certa: q.certa === n ? 0 : q.certa > n ? q.certa - 1 : q.certa })}><Icon name="x" size={14} /></button>}
                        </label>
                      ))}
                      {podeConteudo && q.opcoes.length < 4 && <button type="button" className="tlink sm" onClick={() => setQ({ opcoes: [...q.opcoes, ''] })}>+ opção</button>}
                    </div>
                    <label className="ad-campo"><span>Explicação depois da resposta <small>opcional</small></span><input value={q.explica || ''} disabled={!podeConteudo} onChange={(e) => setQ({ explica: e.target.value })} /></label>
                  </li>
                )
              })}
            </ol>
            {podeConteudo && <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ quiz: [...h.quiz, novaPergunta()] })}>+ Adicionar pergunta</button>}
            <p className="muted sm">Marque a bolinha da resposta certa.</p>
          </section>

          <section className="ad-sec">
            <h2>Palavras novas <small>opcional, até 4; se ficar vazio, a página não aparece no leitor</small></h2>
            <div className="ad-vocab">
              {h.vocabulario.map((v, i) => (
                <div key={i} className="ad-linha">
                  <label className="ad-campo"><span>Palavra</span><input value={v.palavra} disabled={!podeConteudo} onChange={(e) => set({ vocabulario: h.vocabulario.map((x, k) => (k === i ? { ...x, palavra: e.target.value } : x)) })} /></label>
                  <label className="ad-campo g3"><span>Significado</span><input value={v.significado} disabled={!podeConteudo} onChange={(e) => set({ vocabulario: h.vocabulario.map((x, k) => (k === i ? { ...x, significado: e.target.value } : x)) })} /></label>
                  {podeConteudo && <button type="button" className="tlink sm" onClick={() => set({ vocabulario: h.vocabulario.filter((_, k) => k !== i) })}>Remover</button>}
                </div>
              ))}
            </div>
            {podeConteudo && h.vocabulario.length < 4 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ vocabulario: [...h.vocabulario, { palavra: '', significado: '' }] })}>+ Adicionar palavra</button>}
          </section>
        </>
      )}

      {admin && !nova && h.status !== 'publicado' && <button className="tlink sm ad-apagar" onClick={apagar}>Apagar esta história</button>}

      {(podeConteudo || nova) && (
        <div className={`ad-salvar ${sujo ? 'on' : ''}`}>
          {msg && <span className={msg.ok ? 'form-ok' : 'form-error'}>{msg.text}</span>}
          {!msg && <span className="muted">{sujo ? 'Há alterações não salvas.' : 'Tudo salvo.'}</span>}
          <button className="btn btn-main" onClick={() => salvar()} disabled={!!busy || (!sujo && !nova)}>{busy === 'salvar' ? 'Salvando…' : nova ? 'Criar rascunho' : 'Salvar'}</button>
        </div>
      )}
      {!(podeConteudo || nova) && msg && <p className={msg.ok ? 'form-ok' : 'form-error'}>{msg.text}</p>}
    </div>
  )
}
