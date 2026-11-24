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
  // Folhas do livro: capa, páginas da história, palavras novas, uma página por pergunta do quiz,
  // o resultado (céu de estrelas) e o fim. Todas contam no progresso.
  const folhas = useMemo(() => ['capa', ...book.paginas.map((_, k) => k), ...(temVocab ? ['vocab'] : []),
    ...(temQuiz ? [...book.quiz.map((_, k) => `q${k}`), 'resultado'] : []), 'fim'], [book, temVocab, temQuiz])
  const demoKey = `gbm-leitor-${book.slug}-${profile?.id}`
  const salvo = book.amostra ? pref(demoKey, { page: 0 }) : entry
  const retomar = salvo && salvo.page > 0 && salvo.page < N ? salvo.page : 0 // ao chegar ao fim a página vira N e a próxima leitura começa da capa

  const [i, setI] = useState(retomar)
  const [aviso, setAviso] = useState(retomar > 0)
  const [escala, setEscala] = useState(() => Math.min(ESCALAS.length - 1, pref('gbm-leitor-escala', 1)))
  const [perguntas, setPerguntas] = useState(() => pref('gbm-leitor-perguntas', false))
  const [virando, setVirando] = useState(null) // { de, para, dir } enquanto a folha vira
  const livro = useModoLivro()
  const folha = folhas[i]
  // Respostas do quiz ficam aqui (e não dentro da pergunta) para sobreviver às viradas de página.
  const [resp, setResp] = useState(() => (book.quiz || []).map(() => null))
  const quizK = (f) => (typeof f === 'string' && /^q\d+$/.test(f) ? Number(f.slice(1)) : -1)
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

  const quizSalvo = useRef('')
  useEffect(() => {
    if (folha !== 'resultado' || book.amostra) return
    const chave = resp.join(',')
    if (quizSalvo.current === chave) return
    quizSalvo.current = chave
    save(book.slug, { quiz_score: resp.filter((r, n) => r === book.quiz[n].certa).length, quiz_total: book.quiz.length }).catch(() => {})
  }, [folha, resp]) // eslint-disable-line react-hooks/exhaustive-deps

  const escolher = (k, o) => setResp((r) => (r[k] != null ? r : r.map((x, n) => (n === k ? o : x))))
  const deNovo = () => { setResp(book.quiz.map(() => null)); ir(() => folhas.indexOf('q0')) }

  // Virar a página: a folha gira sobre a lombada (ou sobre a borda esquerda, no celular).
  const virandoRef = useRef(false)
  const ir = useCallback((k) => {
    if (virandoRef.current) return
    const novo = Math.max(0, Math.min(folhas.length - 1, k(i)))
    setAviso(false)
    if (novo === i) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setI(novo); return }
    virandoRef.current = true
    setVirando({ de: i, para: novo, dir: novo > i ? 1 : -1 })
    setTimeout(() => { setI(novo); setVirando(null); virandoRef.current = false }, VIRAR_MS)
  }, [folhas.length, i])
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

  // Deslizar o dedo para virar a página, começando em qualquer ponto da tela.
  // Nos primeiros pixels decide a direção: se for de lado, a página não rola e o gesto vira a folha;
  // se for para cima ou para baixo, é rolagem normal do texto. No computador, arrastar com o mouse também vira.
  const palco = useRef(null)
  const vira = useRef({ prox, ant })
  vira.current = { prox, ant }
  useEffect(() => {
    const el = palco.current
    if (!el) return
    let t0 = null
    const ini = (e) => {
      if (e.touches.length !== 1 || e.target.closest('textarea,input')) { t0 = null; return }
      t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), dir: null }
    }
    const mov = (e) => {
      if (!t0) return
      const dx = e.touches[0].clientX - t0.x, dy = e.touches[0].clientY - t0.y
      if (!t0.dir && Math.hypot(dx, dy) > 8) t0.dir = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (t0.dir === 'x' && e.cancelable) e.preventDefault()
    }
    const fim = (e) => {
      if (!t0 || t0.dir !== 'x') { t0 = null; return }
      const dx = e.changedTouches[0].clientX - t0.x
      const rapido = Math.abs(dx) / Math.max(1, Date.now() - t0.t) > 0.25
      if (Math.abs(dx) > 45 || (rapido && Math.abs(dx) > 24)) (dx < 0 ? vira.current.prox : vira.current.ant)()
      t0 = null
    }
    const cancela = () => { t0 = null }
    el.addEventListener('touchstart', ini, { passive: true })
    el.addEventListener('touchmove', mov, { passive: false })
    el.addEventListener('touchend', fim)
    el.addEventListener('touchcancel', cancela)
    return () => {
      el.removeEventListener('touchstart', ini); el.removeEventListener('touchmove', mov)
      el.removeEventListener('touchend', fim); el.removeEventListener('touchcancel', cancela)
    }
  }, [])
  const toque = useRef(null)
  const onPointerDown = (e) => { toque.current = e.pointerType === 'mouse' ? { x: e.clientX, y: e.clientY } : null }
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

  // Conteúdo de cada folha. No livro aberto: página da esquerda e da direita; no celular: uma página só.
  const extras = { recomecar: () => ir(() => 0), fechar, nav }
  function faces(f) {
    if (f === 'capa') return { esq: <PgImagem src={byId[book.slug]?.capa || book.capa} capa />, dir: <Capa book={book} comecar={prox} soTexto /> }
    if (typeof f === 'number') {
      const p = book.paginas[f]
      return { esq: <PgImagem src={p.imagem} alt={p.alt} />, dir: <PgTexto p={p} n={f + 1} perguntas={perguntas} /> }
    }
    if (f === 'vocab') return { esq: <PgEtapa book={book} titulo="Palavras novas" sub="Palavras que apareceram na história" />, dir: <Vocabulario itens={book.vocabulario} semTitulo /> }
    if (quizK(f) >= 0) return { esq: <PgEtapa book={book} titulo="Hora do quiz" sub={`Pergunta ${quizK(f) + 1} de ${book.quiz.length}. Cada resposta certa acende uma estrela.`} />, dir: <QuizPergunta qs={book.quiz} k={quizK(f)} resp={resp} escolher={escolher} prox={prox} /> }
    if (f === 'resultado') return { esq: <Resultado parte="ceu" qs={book.quiz} resp={resp} />, dir: <Resultado parte="resumo" qs={book.quiz} resp={resp} entry={entry} denovo={deNovo} seguir={prox} /> }
    return { esq: <PgImagem src={book.paginas[N - 1].imagem} fim />, dir: <Fim book={book} entry={entry} save={save} {...extras} recomecar={extras.recomecar} /> }
  }
  function unica(f) {
    if (f === 'capa') return <Capa book={book} comecar={prox} />
    if (typeof f === 'number') return <Pagina p={book.paginas[f]} perguntas={perguntas} />
    if (f === 'vocab') return <Vocabulario itens={book.vocabulario} />
    if (quizK(f) >= 0) return <QuizPergunta qs={book.quiz} k={quizK(f)} resp={resp} escolher={escolher} prox={prox} />
    if (f === 'resultado') return <Resultado qs={book.quiz} resp={resp} entry={entry} denovo={deNovo} seguir={prox} />
    return <Fim book={book} entry={entry} save={save} {...extras} />
  }

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

      <main className="lt-palco" ref={palco} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <div className="lt-mesa" aria-live="polite">
          {livro ? (
            <div className="lt-livro">
              <Abertura v={virando} f={(n) => faces(folhas[n])} i={i} />
              <div className="lt-lombada" />
            </div>
          ) : (
            <div className="lt-folhas">
              <Unica v={virando} f={(n) => unica(folhas[n])} i={i} />
            </div>
          )}
        </div>
        {i > 0 && <button className="lt-seta esq" onClick={ant} aria-label="Página anterior"><Icon name="chev" size={28} /></button>}
        {i < folhas.length - 1 && folha !== 'capa' && <button className="lt-seta dir" onClick={prox} aria-label="Próxima página"><Icon name="chev" size={28} /></button>}
      </main>

      <footer className="lt-pe">
        <button className="lt-seta esq" onClick={ant} disabled={i === 0} aria-label="Página anterior"><Icon name="chev" size={26} /></button>
        {/* A barra mede a experiência inteira (história + palavras novas + quiz + fim); a marca mostra onde a história termina. */}
        {/* Dois trechos: a leitura da história (laranja) e as atividades depois dela (palavras novas, quiz, resultado, fim). */}
        <div className="lt-barra" role="progressbar" aria-valuemin={0} aria-valuemax={folhas.length - 1} aria-valuenow={i} aria-label="Progresso do livro">
          <span className="lt-trilho leitura" style={{ flexGrow: N }} title="História"><i style={{ width: `${(Math.min(i, N) / N) * 100}%` }} /></span>
          {folhas.length - 1 > N && (
            <span className="lt-trilho atividades" style={{ flexGrow: folhas.length - 1 - N }} title="Atividades"><i style={{ width: `${(Math.max(0, i - N) / (folhas.length - 1 - N)) * 100}%` }} /></span>
          )}
        </div>
        <span>{folha === 'capa' ? `${folhas.length - 1} páginas` : `${i} de ${folhas.length - 1}`}{!historia && folha !== 'capa' && ` · ${folha === 'vocab' ? 'Palavras novas' : quizK(folha) >= 0 ? 'Quiz' : folha === 'resultado' ? 'Resultado' : 'Fim'}`}</span>
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

const VIRAR_MS = 800

// Livro aberto na tela deitada: duas páginas e a lombada no meio.
function useModoLivro() {
  const q = '(min-aspect-ratio: 11/10) and (min-width: 640px)'
  const [sim, setSim] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const f = () => setSim(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return sim
}

// Abertura do livro. Para avançar, a folha da direita gira sobre a lombada: na frente, a página
// que estava à direita; no verso, a próxima página da esquerda. Por baixo já está a próxima da direita.
// Para voltar, o movimento é o inverso.
function Abertura({ v, f, i }) {
  if (!v) {
    const a = f(i)
    return <><div className="lt-pg esq">{a.esq}</div><div className="lt-pg dir">{a.dir}</div></>
  }
  const de = f(v.de), para = f(v.para)
  const vai = v.dir > 0
  return (
    <>
      <div className="lt-pg esq">{vai ? de.esq : para.esq}</div>
      <div className="lt-pg dir">{vai ? para.dir : de.dir}</div>
      <div className={`lt-folha3d ${vai ? 'vai' : 'volta'}`} style={{ animationDuration: `${VIRAR_MS}ms` }}>
        <div className="lt-face frente lt-pg dir">{vai ? de.dir : para.dir}</div>
        <div className="lt-face verso lt-pg esq">{vai ? para.esq : de.esq}</div>
      </div>
    </>
  )
}

// Celular em pé: uma página por vez, que vira pela borda esquerda.
function Unica({ v, f, i }) {
  if (!v) return <div className="lt-folha">{f(i)}</div>
  const vai = v.dir > 0
  return (
    <>
      <div className="lt-folha">{vai ? f(v.para) : f(v.de)}</div>
      <div className={`lt-folha3d unica ${vai ? 'vai' : 'volta'}`} style={{ animationDuration: `${VIRAR_MS}ms` }}>
        <div className="lt-face frente lt-folha">{vai ? f(v.de) : f(v.para)}</div>
        <div className="lt-face verso lt-folha lt-papel" />
      </div>
    </>
  )
}

function PgImagem({ src: s, alt = '', capa, fim }) {
  return (
    <div className={`lt-pg-img${capa ? ' capa' : ''}`}>
      <img src={src(s)} alt={alt} draggable="false" />
      {fim && <span className="lt-fim-selo">Fim</span>}
    </div>
  )
}

function PgTexto({ p, n, perguntas }) {
  return (
    <div className="lt-pg-txt">
      <div className="lt-pg-corpo">
        <p>{p.texto}</p>
        {perguntas && p.pergunta && <aside className="lt-conversa"><small>Para conversar</small>{p.pergunta}</aside>}
      </div>
      <small className="lt-pg-n">{n}</small>
    </div>
  )
}

function PgEtapa({ book, titulo, sub }) {
  return (
    <div className="lt-pg-etapa">
      <img src={src(byId[book.slug]?.capa || book.capa)} alt="" />
      <h2>{titulo}</h2>
      <p>{sub}</p>
    </div>
  )
}

function Capa({ book, comecar, soTexto }) {
  const t = byId[book.slug]
  return (
    <div className={`lt-capa${soTexto ? ' so-texto' : ''}`}>
      {!soTexto && <img src={src(t?.capa || book.capa)} alt="" />}
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

function Vocabulario({ itens, semTitulo }) {
  return (
    <div className="lt-extra">
      {!semTitulo && <h2>Palavras novas da história</h2>}
      <ul className="lt-vocab">
        {itens.map((v) => <li key={v.palavra}><b>{v.palavra}</b><span>{v.significado}</span></li>)}
      </ul>
    </div>
  )
}

// Uma pergunta do quiz é uma página do livro. Dá para pular: no resultado ela aparece como sem resposta.
function QuizPergunta({ qs, k, resp, escolher, prox }) {
  const q = qs[k]
  const esc = resp[k]
  return (
    <div className="lt-extra lt-quiz">
      {k === 0 && (
        <div className="lt-q-faixa" role="heading" aria-level={2}>
          <span className="lt-q-brilhos" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((n) => <i key={n}>★</i>)}</span>
          <b>Hora do quiz!</b>
          <small>Cada resposta certa acende uma estrela</small>
        </div>
      )}
      <div className="lt-q-estrelas" aria-label={`Pergunta ${k + 1} de ${qs.length}`}>
        {qs.map((_, n) => <Estrela key={n} estado={n === k ? (esc == null ? 'agora' : esc === q.certa ? 'acesa' : 'apagada') : resp[n] == null ? (n < k ? 'pulada' : 'vazia') : resp[n] === qs[n].certa ? 'acesa' : 'apagada'} />)}
      </div>
      <h2>{q.pergunta}</h2>
      <div className="lt-opcoes">
        {q.opcoes.map((o, n) => (
          <button key={o} onClick={() => escolher(k, n)} disabled={esc != null}
            className={esc == null ? '' : n === q.certa ? 'certa' : n === esc ? 'errada' : 'apagada'}>
            {esc != null && n === q.certa && <Icon name="check" size={18} />}{o}
          </button>
        ))}
      </div>
      {esc != null && (
        <div className="lt-feed">
          <p><b>{esc === q.certa ? 'Isso mesmo!' : 'Quase!'}</b> {q.explica}</p>
          <button className="lt-btn" onClick={prox}>{k + 1 < qs.length ? 'Próxima pergunta' : 'Ver o céu de vocês'}</button>
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
// parte: 'ceu' (céu + frase), 'resumo' (pergunta por pergunta + botões) ou as duas (celular).
function Resultado({ qs, resp, entry, denovo, seguir, parte }) {
  const total = qs.length
  const acertos = resp.filter((r, n) => r === qs[n].certa).length
  const puladas = resp.filter((r) => r == null).length
  const tudo = acertos === total
  const frase = tudo ? 'Constelação completa!' : acertos >= total / 2 ? 'Que céu bonito vocês acenderam!' : 'O céu de vocês está começando a brilhar!'
  const sub = tudo ? 'Vocês acertaram todas. Leitores atentos de verdade.'
    : `Vocês acenderam ${acertos} de ${total} ${total === 1 ? 'estrela' : 'estrelas'}.${puladas ? ` ${puladas === 1 ? 'Ficou uma' : `Ficaram ${puladas}`} sem resposta.` : ''} As apagadas estão escondidas nas páginas: que tal procurar juntos?`
  // estrelas em arco sobre o livro
  const pos = qs.map((_, n) => {
    const a = Math.PI * (0.15 + 0.7 * (total === 1 ? 0.5 : n / (total - 1)))
    return { x: 160 - Math.cos(a) * 120, y: 150 - Math.sin(a) * 110 }
  })
  return (
    <div className={`lt-extra lt-resultado${parte ? ' ' + parte : ''}`}>
      {parte !== 'resumo' && <>
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
            const pulou = resp[n] == null
            return (
              <g key={n} transform={`translate(${p.x} ${p.y})`}>
                {ok && <circle r="26" fill="url(#lt-brilho)" className="lt-halo" style={{ animationDelay: `${300 + n * 450}ms` }} />}
                <g className={`lt-estrela-g ${ok ? 'acesa' : pulou ? 'pulada' : 'apagada'}`} style={{ animationDelay: `${300 + n * 450}ms` }}>
                  <path transform="translate(-16 -16) scale(1.33)" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
                </g>
              </g>
            )
          })}
          <text x="160" y="128" textAnchor="middle" className="lt-placar"><tspan className="n">{acertos}</tspan><tspan dx="6" className="de">de {total}</tspan></text>
          <g className="lt-ceu-livro" transform="translate(160 178)">
            <path d="M-70 -18 Q-35 -32 0 -18 Q35 -32 70 -18 L70 6 Q35 -8 0 6 Q-35 -8 -70 6 Z" />
            <path d="M0 -18 L0 6" className="lt-livro-meio" />
          </g>
        </svg>
      </div>
      <h2>{frase}</h2>
      <p>{sub}</p>
      </>}
      {parte !== 'ceu' && <>
      {parte === 'resumo' && <h2 className="lt-res-tit">Pergunta por pergunta</h2>}
      <ul className="lt-recap">
        {qs.map((x, n) => {
          const ok = resp[n] === x.certa
          const pulou = resp[n] == null
          return (
            <li key={n} className={ok ? 'ok' : pulou ? 'pulada' : 'busca'}>
              <Estrela estado={ok ? 'acesa' : pulou ? 'pulada' : 'apagada'} size={20} />
              <span><b>{x.pergunta}</b>{ok ? <small>Vocês acertaram: {x.opcoes[x.certa]}</small>
                : pulou ? <small><em>Ficou sem resposta.</em> A resposta é “{x.opcoes[x.certa]}”</small>
                : <small>Para buscar no livro: a resposta é “{x.opcoes[x.certa]}”</small>}</span>
            </li>
          )
        })}
      </ul>
      {/* Seguir é o caminho principal; responder de novo fica como opção discreta. */}
      <div className="lt-acoes">
        <button className="lt-btn" onClick={seguir}>Continuar <Icon name="chev" size={20} /></button>
        <button className="lt-link" onClick={denovo}>Responder de novo</button>
      </div>
      {entry?.quiz_total > 0 && <p className="lt-mudo lt-ultima">Da última vez: {entry.quiz_score} de {entry.quiz_total}</p>}
      </>}
      {tudo && parte !== 'resumo' && <div className="lt-chuva" aria-hidden="true">{Array.from({ length: 18 }, (_, n) => <i key={n} style={{ left: `${(n * 53) % 100}%`, animationDelay: `${1800 + (n % 6) * 180}ms`, animationDuration: `${2.4 + (n % 4) * 0.5}s` }}>★</i>)}</div>}
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
  const [estado, setEstado] = useState(null) // null | 'salvando' | 'salvo'
  // O diário salva sozinho: pouco depois de parar de digitar, ao sair do campo e ao sair da tela.
  const salvo = useRef(entry?.diary || '')
  const atual = useRef(diario)
  atual.current = diario
  const guardar = useCallback(() => {
    const txt = atual.current
    if (txt === salvo.current) return
    salvo.current = txt
    if (book.amostra) { setEstado('salvo'); return }
    setEstado('salvando')
    save(book.slug, { diary: txt }).then(() => setEstado('salvo')).catch(() => { salvo.current = null; setEstado(null) })
  }, [book, save])
  useEffect(() => {
    if (diario === salvo.current) return
    const id = setTimeout(guardar, 900)
    return () => clearTimeout(id)
  }, [diario, guardar])
  useEffect(() => () => guardar(), [guardar])

  function gostou(v) {
    const novo = liked === v ? null : v
    setLiked(novo)
    if (!book.amostra) save(book.slug, { status: 'lido', liked: novo }).catch(() => {})
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
        <p className="lt-crescer"><small>Quando crescer, {o.tipo === 'filme' ? 'assista' : 'leia'}</small><b>{o.titulo}</b>{o.autor && <span>de {o.autor}</span>}</p>
      )}
      <label className="lt-diario">
        <span>Diário da leitura{estado && <em className="lt-salvo">{estado === 'salvando' ? 'Salvando…' : 'Salvo'}</em>}</span>
        <textarea rows={3} maxLength={2000} value={diario} onChange={(e) => { setDiario(e.target.value); setEstado(null) }} onBlur={guardar}
          placeholder="O que a criança disse ou perguntou durante a leitura? Ex.: quis saber se a baleia tinha mãe." />
      </label>
      {proximo && <div className="lt-acoes"><button className="lt-btn" onClick={() => nav(`/ler/${proximo.id}`, { replace: true })}>Próximo do box: {proximo.titulo}</button></div>}
      <div className="lt-acoes">
        <button className="lt-link" onClick={recomecar}>Ler de novo</button>
        <button className="lt-link" onClick={fechar}>Voltar para a estante</button>
      </div>
    </div>
  )
}
