// Leitor de livros do GBM. Decisões baseadas na pesquisa (nov/2026):
// fundo creme fixo, fonte Andika, letra grande com A−/A+, uma ilustração por página,
// texto sempre fora da imagem, nada de jogos ou pontos de toque dentro da história.
// Extras: continua de onde parou, perguntas opcionais para o adulto, vocabulário,
// quiz e diário da leitura no fim.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import '@fontsource/andika/latin-400.css'
import '@fontsource/andika/latin-700.css'
import './leitor.css'
import { api } from '../api'
import { useLibrary } from '../library'
import { Icon } from '../ds'
import { boxOf, byId, src } from '../catalog'

const ESCALAS = [0.85, 1, 1.15, 1.3]
const pref = (k, v) => { try { const s = localStorage.getItem(k); return s == null ? v : JSON.parse(s) } catch { return v } }
const guarda = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* sem storage */ } }

export default function Leitor() {
  const { slug } = useParams()
  const nav = useNavigate()
  const { state } = useLocation()
  const { bySlug, save, ready, profile } = useLibrary()
  const [carregado, setCarregado] = useState(state?.book?.slug === slug ? state.book : null)
  const [falha, setFalha] = useState(null)
  const book = carregado?.slug === slug ? carregado : null
  const erro = falha?.slug === slug ? falha.texto : null

  useEffect(() => {
    if (book) return
    let vivo = true
    const falhou = (texto) => vivo && setFalha({ slug, texto })
    api(`/titles/${slug}/read`)
      .then((b) => (b.paginas ? vivo && setCarregado({ ...b, slug }) : falhou('Este livro ainda está sendo preparado. Avisaremos quando ficar pronto.')))
      .catch((e) => falhou(e.code === 'sem_acesso' ? 'As assinaturas abrem em breve. Avisaremos você.' : e.status === 404 ? 'Não encontramos este livro.' : e.message))
    return () => { vivo = false }
  }, [slug, book])

  const fechar = () => (window.history.length > 1 ? nav(-1) : nav('/inicio'))

  if (erro) return <div className="leitor leitor-msg"><p>{erro}</p><button className="lt-btn" onClick={fechar}>Voltar</button></div>
  if (!book || (!book.amostra && !ready)) return <div className="leitor leitor-msg"><p>Abrindo o livro…</p></div>
  return <Livro key={`${slug}-${profile?.id}`} book={book} entry={bySlug[slug]} save={save} profile={profile} fechar={fechar} />
}

function Livro({ book, entry, save, profile, fechar }) {
  const nav = useNavigate()
  const N = book.paginas.length
  const temVocab = book.vocabulario?.length > 0
  const temQuiz = book.quiz?.length > 0
  const temPerguntas = book.paginas.some((p) => p.pergunta)
  // Folhas: capa, páginas da história, vocabulário, quiz, fim.
  const folhas = useMemo(() => ['capa', ...book.paginas.map((_, k) => k), ...(temVocab ? ['vocab'] : []), ...(temQuiz ? ['quiz'] : []), 'fim'], [book, temVocab, temQuiz])
  const demoKey = `gbm-leitor-${book.slug}-${profile?.id}`
  const salvo = book.amostra ? pref(demoKey, { page: 0 }) : entry
  const retomar = salvo && salvo.page > 0 && salvo.page < N ? salvo.page : 0 // ao chegar ao fim a página vira N e a próxima leitura começa da capa

  const [i, setI] = useState(retomar)
  const [aviso, setAviso] = useState(retomar > 0)
  const [escala, setEscala] = useState(() => Math.min(ESCALAS.length - 1, pref('gbm-leitor-escala', 1)))
  const [perguntas, setPerguntas] = useState(() => pref('gbm-leitor-perguntas', false))
  const [dir, setDir] = useState(1)
  const folha = folhas[i]
  const pagina = typeof folha === 'number' ? folha + 1 : folha === 'capa' ? 0 : N

  useEffect(() => guarda('gbm-leitor-escala', escala), [escala])
  useEffect(() => guarda('gbm-leitor-perguntas', perguntas), [perguntas])

  // Guarda onde a criança parou (com uma pequena espera para não salvar a cada toque).
  const lido = useRef(entry?.status === 'lido')
  useEffect(() => {
    const t = setTimeout(() => {
      if (book.amostra) { guarda(demoKey, { page: pagina, status: folha === 'fim' ? 'lido' : 'lendo' }); return }
      if (folha === 'fim') { lido.current = true; save(book.slug, { status: 'lido', page: N, pages_total: N }).catch(() => {}); return }
      if (pagina === 0) return
      save(book.slug, { ...(lido.current ? {} : { status: 'lendo' }), page: pagina, pages_total: N }).catch(() => {})
    }, 600)
    return () => clearTimeout(t)
  }, [pagina, folha]) // eslint-disable-line react-hooks/exhaustive-deps

  const ir = useCallback((k) => {
    setI((atual) => {
      const novo = Math.max(0, Math.min(folhas.length - 1, k(atual)))
      setDir(novo >= atual ? 1 : -1)
      return novo
    })
    setAviso(false)
  }, [folhas.length])
  const prox = useCallback(() => ir((a) => a + 1), [ir])
  const ant = useCallback(() => ir((a) => a - 1), [ir])

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('textarea,input')) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') prox()
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') ant()
      else if (e.key === 'Escape') fechar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prox, ant, fechar])

  // Deslizar o dedo para virar a página.
  const toque = useRef(null)
  const onPointerDown = (e) => { toque.current = { x: e.clientX, y: e.clientY } }
  const onPointerUp = (e) => {
    const t0 = toque.current; toque.current = null
    if (!t0) return
    const dx = e.clientX - t0.x, dy = e.clientY - t0.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? prox : ant)()
  }

  // Deixa a próxima ilustração carregada antes de virar.
  useEffect(() => {
    const seguinte = book.paginas[(typeof folha === 'number' ? folha : -1) + 1]
    if (seguinte) new Image().src = src(seguinte.imagem)
  }, [folha, book])

  const historia = typeof folha === 'number'
  return (
    <div className="leitor" style={{ '--esc': ESCALAS[escala] }}>
      <header className="lt-top">
        <button className="lt-ic" onClick={fechar} aria-label="Fechar o livro"><Icon name="x" size={22} /></button>
        <b className="lt-tit">{book.titulo}</b>
        {temPerguntas && (
          <button className="lt-ic lt-perg" aria-pressed={perguntas} onClick={() => setPerguntas((v) => !v)} title="Perguntas para o adulto fazer durante a leitura">
            <Icon name="chat" size={20} /><span>Perguntas</span>
          </button>
        )}
        <div className="lt-tam" role="group" aria-label="Tamanho da letra">
          <button className="lt-ic" onClick={() => setEscala((v) => Math.max(0, v - 1))} disabled={escala === 0} aria-label="Diminuir a letra">A−</button>
          <button className="lt-ic" onClick={() => setEscala((v) => Math.min(ESCALAS.length - 1, v + 1))} disabled={escala === ESCALAS.length - 1} aria-label="Aumentar a letra">A+</button>
        </div>
      </header>

      <main className="lt-palco" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <div key={i} className={`lt-folha ${dir > 0 ? 'vai' : 'volta'}`} aria-live="polite">
          {folha === 'capa' && <Capa book={book} comecar={prox} />}
          {historia && <Pagina p={book.paginas[folha]} perguntas={perguntas} />}
          {folha === 'vocab' && <Vocabulario itens={book.vocabulario} />}
          {folha === 'quiz' && <Quiz book={book} entry={entry} save={save} />}
          {folha === 'fim' && <Fim book={book} entry={entry} save={save} recomecar={() => ir(() => 0)} fechar={fechar} nav={nav} />}
        </div>
        {i > 0 && <button className="lt-seta esq" onClick={ant} aria-label="Página anterior"><Icon name="chev" size={28} /></button>}
        {i < folhas.length - 1 && folha !== 'capa' && <button className="lt-seta dir" onClick={prox} aria-label="Próxima página"><Icon name="chev" size={28} /></button>}
      </main>

      <footer className="lt-pe">
        <button className="lt-seta esq" onClick={ant} disabled={i === 0} aria-label="Página anterior"><Icon name="chev" size={26} /></button>
        {/* A barra mede a experiência inteira (história + palavras novas + quiz + fim); a marca mostra onde a história termina. */}
        <div className="lt-barra" role="progressbar" aria-valuemin={0} aria-valuemax={folhas.length - 1} aria-valuenow={i} aria-label="Progresso do livro">
          <i style={{ width: `${(i / (folhas.length - 1)) * 100}%` }} />
          {folhas.length - 1 > N && <b className="lt-marca" style={{ left: `${(N / (folhas.length - 1)) * 100}%` }} title="Fim da história" />}
        </div>
        <span>{historia ? `${pagina} de ${N}` : folha === 'capa' ? `${N} páginas` : folha === 'vocab' ? 'Palavras novas' : folha === 'quiz' ? 'Quiz' : 'Fim'}{!historia && folha !== 'capa' && ` · ${folhas.length - 1 - i === 0 ? 'última etapa' : `faltam ${folhas.length - 1 - i}`}`}</span>
        <button className="lt-seta dir" onClick={prox} disabled={i === folhas.length - 1} aria-label="Próxima página"><Icon name="chev" size={26} /></button>
      </footer>

      {aviso && (
        <div className="lt-toast" role="status">
          Continuando da página {retomar}.
          <button onClick={() => ir(() => 0)}>Recomeçar</button>
          <button onClick={() => setAviso(false)} aria-label="Fechar aviso"><Icon name="x" size={16} /></button>
        </div>
      )}
    </div>
  )
}

function Capa({ book, comecar }) {
  const t = byId[book.slug]
  return (
    <div className="lt-capa">
      <img src={src(t?.capa || book.capa)} alt="" />
      <div>
        <h1>{book.titulo}</h1>
        {book.aviso && <p className="lt-aviso">{book.aviso}</p>}
        <button className="lt-btn" onClick={comecar}>Começar a ler <Icon name="chev" size={20} /></button>
      </div>
    </div>
  )
}

function Pagina({ p, perguntas }) {
  return (
    <div className="lt-pag">
      <figure><img src={src(p.imagem)} alt={p.alt || ''} draggable="false" /></figure>
      <div className="lt-texto">
        <p>{p.texto}</p>
        {perguntas && p.pergunta && (
          <aside className="lt-conversa"><small>Para conversar</small>{p.pergunta}</aside>
        )}
      </div>
    </div>
  )
}

function Vocabulario({ itens }) {
  return (
    <div className="lt-extra">
      <h2>Palavras novas da história</h2>
      <ul className="lt-vocab">
        {itens.map((v) => <li key={v.palavra}><b>{v.palavra}</b><span>{v.significado}</span></li>)}
      </ul>
    </div>
  )
}

function Quiz({ book, entry, save }) {
  const qs = book.quiz
  const [k, setK] = useState(0)
  const [esc, setEsc] = useState(null)
  const [resp, setResp] = useState([]) // índice escolhido em cada pergunta
  const q = qs[k]
  const fim = k >= qs.length
  const acertos = resp.filter((r, n) => r === qs[n].certa).length

  function escolher(o) {
    if (esc != null) return
    setEsc(o)
  }
  function seguir() {
    const novas = [...resp, esc]
    setResp(novas); setEsc(null); setK((v) => v + 1)
    if (k + 1 >= qs.length && !book.amostra) {
      save(book.slug, { quiz_score: novas.filter((r, n) => r === qs[n].certa).length, quiz_total: qs.length }).catch(() => {})
    }
  }

  if (fim) return <Resultado qs={qs} resp={resp} acertos={acertos} entry={entry} denovo={() => { setK(0); setResp([]) }} />
  return (
    <div className="lt-extra lt-quiz">
      <div className="lt-q-estrelas" aria-label={`Pergunta ${k + 1} de ${qs.length}`}>
        {qs.map((_, n) => <Estrela key={n} estado={n < k ? (resp[n] === qs[n].certa ? 'acesa' : 'apagada') : n === k ? 'agora' : 'vazia'} />)}
      </div>
      <h2>{q.pergunta}</h2>
      <div className="lt-opcoes">
        {q.opcoes.map((o, n) => (
          <button key={o} onClick={() => escolher(n)} disabled={esc != null}
            className={esc == null ? '' : n === q.certa ? 'certa' : n === esc ? 'errada' : 'apagada'}>
            {esc != null && n === q.certa && <Icon name="check" size={18} />}{o}
          </button>
        ))}
      </div>
      {esc != null && (
        <div className="lt-feed">
          <p><b>{esc === q.certa ? 'Isso mesmo!' : 'Quase!'}</b> {q.explica}</p>
          <button className="lt-btn" onClick={seguir}>{k + 1 < qs.length ? 'Próxima pergunta' : 'Ver o céu de vocês'}</button>
        </div>
      )}
    </div>
  )
}

const Estrela = ({ estado, delay = 0, size = 22 }) => (
  <svg className={`lt-estrela ${estado}`} style={{ animationDelay: `${delay}ms` }} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
  </svg>
)

// Resultado do quiz: cada pergunta é uma estrela no céu do livro.
// Acerto acende a estrela; erro deixa uma "estrela para buscar no livro", com a resposta certa ao lado.
function Resultado({ qs, resp, acertos, entry, denovo }) {
  const total = qs.length
  const tudo = acertos === total
  const frase = tudo ? 'Constelação completa!' : acertos >= total / 2 ? 'Que céu bonito vocês acenderam!' : 'O céu de vocês está começando a brilhar!'
  const sub = tudo ? 'Vocês acertaram todas. Leitores atentos de verdade.'
    : `Vocês acenderam ${acertos} de ${total} ${total === 1 ? 'estrela' : 'estrelas'}. As apagadas estão escondidas nas páginas: que tal procurar juntos?`
  // estrelas em arco sobre o livro
  const pos = qs.map((_, n) => {
    const a = Math.PI * (0.15 + 0.7 * (total === 1 ? 0.5 : n / (total - 1)))
    return { x: 160 - Math.cos(a) * 120, y: 150 - Math.sin(a) * 110 }
  })
  return (
    <div className="lt-extra lt-resultado">
      <div className="lt-ceu" role="img" aria-label={`${acertos} de ${total} estrelas acesas`}>
        <svg viewBox="0 0 320 200" className="lt-ceu-svg">
          <defs>
            <radialGradient id="lt-brilho"><stop offset="0" stopColor="#ffd65a" stopOpacity=".55" /><stop offset="1" stopColor="#ffd65a" stopOpacity="0" /></radialGradient>
          </defs>
          {pos.slice(1).map((p, n) => (resp[n] === qs[n].certa && resp[n + 1] === qs[n + 1].certa) && (
            <line key={n} className="lt-traco" style={{ animationDelay: `${400 + (n + 1) * 450}ms` }} x1={pos[n].x} y1={pos[n].y} x2={p.x} y2={p.y} />
          ))}
          {pos.map((p, n) => {
            const ok = resp[n] === qs[n].certa
            return (
              <g key={n} transform={`translate(${p.x} ${p.y})`}>
                {ok && <circle r="26" fill="url(#lt-brilho)" className="lt-halo" style={{ animationDelay: `${300 + n * 450}ms` }} />}
                <g className={`lt-estrela-g ${ok ? 'acesa' : 'apagada'}`} style={{ animationDelay: `${300 + n * 450}ms` }}>
                  <path transform="translate(-16 -16) scale(1.33)" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
                </g>
              </g>
            )
          })}
          <text x="160" y="128" textAnchor="middle" className="lt-placar"><tspan className="n">{acertos}</tspan><tspan dx="6" className="de">de {total}</tspan></text>
          <g className="lt-livro" transform="translate(160 178)">
            <path d="M-70 -18 Q-35 -32 0 -18 Q35 -32 70 -18 L70 6 Q35 -8 0 6 Q-35 -8 -70 6 Z" />
            <path d="M0 -18 L0 6" className="lt-livro-meio" />
          </g>
        </svg>
      </div>
      <h2>{frase}</h2>
      <p>{sub}</p>
      <ul className="lt-recap">
        {qs.map((x, n) => {
          const ok = resp[n] === x.certa
          return (
            <li key={n} className={ok ? 'ok' : 'busca'}>
              <Estrela estado={ok ? 'acesa' : 'apagada'} size={20} />
              <span><b>{x.pergunta}</b>{ok ? <small>Vocês acertaram: {x.opcoes[x.certa]}</small> : <small>Para buscar no livro: a resposta é “{x.opcoes[x.certa]}”</small>}</span>
            </li>
          )
        })}
      </ul>
      <div className="lt-acoes">
        <button className="lt-btn lt-sec" onClick={denovo}>Acender de novo</button>
        {entry?.quiz_total > 0 && <span className="lt-mudo">Da última vez: {entry.quiz_score} de {entry.quiz_total}</span>}
      </div>
      {tudo && <div className="lt-chuva" aria-hidden="true">{Array.from({ length: 18 }, (_, n) => <i key={n} style={{ left: `${(n * 53) % 100}%`, animationDelay: `${1800 + (n % 6) * 180}ms`, animationDuration: `${2.4 + (n % 4) * 0.5}s` }}>★</i>)}</div>}
    </div>
  )
}

function Fim({ book, entry, save, recomecar, fechar, nav }) {
  const t = byId[book.slug]
  const o = book.quando_crescer || t?.obra_mae
  const box = t && boxOf(t)
  const proximo = box && byId[box.grupo.titulos[box.index + 1]]
  const [liked, setLiked] = useState(entry?.liked ?? null)
  const [diario, setDiario] = useState(entry?.diary || '')
  const [ok, setOk] = useState(false)

  function gostou(v) {
    const novo = liked === v ? null : v
    setLiked(novo)
    if (!book.amostra) save(book.slug, { status: 'lido', liked: novo }).catch(() => {})
  }
  function guardarDiario() {
    if (!book.amostra) save(book.slug, { diary: diario }).catch(() => {})
    setOk(true)
  }

  return (
    <div className="lt-extra lt-fim">
      <h2>Fim!</h2>
      <div className="lt-gostou">
        <span>Gostaram da história?</span>
        <button aria-pressed={liked === true} onClick={() => gostou(true)}><Icon name="up" size={20} />Gostamos</button>
        <button aria-pressed={liked === false} onClick={() => gostou(false)}><Icon name="down" size={20} />Não muito</button>
      </div>
      {o && (
        <p className="lt-crescer"><small>Quando crescer, {o.tipo === 'filme' ? 'assista' : 'leia'}</small><b>{o.titulo}</b>{o.autor && <span>, de {o.autor}</span>}</p>
      )}
      <label className="lt-diario">
        <span>Diário da leitura</span>
        <textarea rows={3} maxLength={2000} value={diario} onChange={(e) => { setDiario(e.target.value); setOk(false) }}
          placeholder="O que a criança disse ou perguntou durante a leitura? Ex.: quis saber se a baleia tinha mãe." />
      </label>
      <div className="lt-acoes">
        <button className="lt-btn lt-sec" onClick={guardarDiario} disabled={ok || !diario.trim()}>{ok ? 'Guardado no diário' : 'Guardar no diário'}</button>
        {proximo && <button className="lt-btn" onClick={() => nav(`/ler/${proximo.id}`, { replace: true })}>Próximo do box: {proximo.titulo}</button>}
      </div>
      <div className="lt-acoes">
        <button className="lt-link" onClick={recomecar}>Ler de novo</button>
        <button className="lt-link" onClick={fechar}>Voltar para a estante</button>
      </div>
    </div>
  )
}
