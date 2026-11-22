import { useEffect, useState } from 'react'
import { api } from '../api'
import { useSession } from '../session'
import { Card, Empty, Icon, Modal, PageHead, Tag } from '../ds'
import { FormError } from '../ui'

const fmt = (d) => (d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—')
const REASON = {
  preco: 'O preço não cabe agora', poucos_livros: 'Poucos livros para a idade', perderam_interesse: 'As crianças perderam o interesse',
  problema_tecnico: 'Problemas técnicos', so_testando: 'Só queria conhecer', outro: 'Outro motivo',
}

export default function Assinatura() {
  const { refresh } = useSession()
  const [s, setS] = useState(null)
  const [cancel, setCancel] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => { api('/me/subscription').then(setS).catch((e) => setError(e.message)) }, [])
  if (!s) return <div className="page narrow"><PageHead title="Assinatura" />{error ? <FormError error={error} /> : <p className="muted">Carregando…</p>}</div>

  const has = s.kind === 'liberado' || s.kind === 'assinatura'
  const canceled = !!s.renewal_canceled_at
  async function resume() {
    try { setS(await api('/me/subscription/resume', { method: 'POST' })); await refresh() } catch (e) { setError(e.message) }
  }

  return (
    <div className="page narrow">
      <PageHead title="Gerenciar assinatura" sub="Plano, próxima cobrança e cancelamento" />
      {!has ? (
        <Card><Empty icon="card" title={s.kind === 'bloqueado' ? 'Conta bloqueada' : 'Sem assinatura ativa'}>
          {s.kind === 'bloqueado' ? 'Fale com a gente para entender o que houve.' : 'As assinaturas abrem em breve, por R$ 19,90 por mês. Avisaremos você.'}
        </Empty></Card>
      ) : (
        <>
          {canceled && (
            <div className="aviso">
              <b>Renovação cancelada em {fmt(s.renewal_canceled_at)}.</b> O acesso ao catálogo continua até {fmt(s.period_end)}.
              Os PDFs já baixados continuam de vocês para sempre.
              <div className="acts"><button className="btn btn-sm btn-main" onClick={resume}>Manter minha assinatura</button></div>
            </div>
          )}
          <Card title={s.kind === 'liberado' ? 'Acesso liberado' : `Plano ${s.plan}`}
            action={<Tag tone={canceled ? 'red' : 'green'}>{canceled ? 'Não renova' : 'Ativa'}</Tag>}>
            <dl className="facts">
              <div><dt>Valor</dt><dd>{s.kind === 'liberado' ? 'Sem cobrança' : s.price ? `R$ ${s.price.toFixed(2).replace('.', ',')}/mês` : '—'}</dd></div>
              <div><dt>Próxima cobrança</dt><dd>{s.next_charge_at ? fmt(s.next_charge_at) : canceled ? 'Nenhuma' : 'Sem cobrança automática'}</dd></div>
              <div><dt>Acesso ao catálogo até</dt><dd>{fmt(s.period_end)}</dd></div>
              <div><dt>PDFs baixados</dt><dd>{s.downloads} {s.downloads === 1 ? 'livro' : 'livros'}, seus para sempre</dd></div>
            </dl>
            <p className="muted sm">{s.kind === 'liberado' ? 'Acesso concedido pela equipe GBM.' : 'O pagamento on-line chega em breve; por enquanto o período é renovado pela equipe.'}</p>
            {!canceled && <div className="acts"><button className="btn btn-sm btn-danger-ghost" onClick={() => setCancel(true)}>Cancelar assinatura</button></div>}
          </Card>
        </>
      )}
      <FormError error={error} />
      {cancel && <Cancelar s={s} onClose={() => setCancel(false)} onDone={async (next) => { setS(next); setCancel(false); await refresh() }} />}
    </div>
  )
}

// Antes de cancelar: NPS (0 a 10), motivo e comentário; depois, confirmação clara do que acontece.
function Cancelar({ s, onClose, onDone }) {
  const [step, setStep] = useState(1)
  const [nps, setNps] = useState(null)
  const [reason, setReason] = useState(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  async function confirm() {
    setBusy(true); setError(null)
    try { onDone(await api('/me/subscription/cancel', { method: 'POST', body: { nps_score: nps, reason, comment } })) }
    catch (e) { setError(e.message); setBusy(false) }
  }
  return (
    <Modal title="Antes de ir, uma pergunta" onClose={onClose}>
      <ol className="steps-dots" aria-label={`Passo ${step} de 3`}>{[1, 2, 3].map((n) => <li key={n} className={n <= step ? 'on' : ''} />)}</ol>
      {step === 1 && (
        <div className="stack">
          <p>De 0 a 10, qual a chance de você recomendar o GBM a outra família?</p>
          <div className="nps">
            {Array.from({ length: 11 }, (_, n) => (
              <button key={n} aria-pressed={nps === n} className={n <= 6 ? 'lo' : n <= 8 ? 'mid' : 'hi'} onClick={() => setNps(n)}>{n}</button>
            ))}
          </div>
          <div className="nps-l"><small>Nada provável</small><small>Muito provável</small></div>
          <div className="acts"><button className="btn btn-main" disabled={nps == null} onClick={() => setStep(2)}>Continuar</button></div>
        </div>
      )}
      {step === 2 && (
        <div className="stack">
          <p>O que pesou mais na decisão?</p>
          <div className="reasons">
            {s.reasons.map((r) => <button key={r} aria-pressed={reason === r} onClick={() => setReason(r)}>{REASON[r] || r}</button>)}
          </div>
          <label className="field"><span>Quer contar mais? (opcional)</span>
            <textarea rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="O que faria você ficar?" />
          </label>
          <div className="acts"><button className="btn btn-ghost" onClick={() => setStep(1)}>Voltar</button><button className="btn btn-main" disabled={!reason} onClick={() => setStep(3)}>Continuar</button></div>
        </div>
      )}
      {step === 3 && (
        <div className="stack">
          <p><b>Confirme o cancelamento.</b></p>
          <ul className="conseq">
            <li><Icon name="clock" size={18} /><span>O acesso ao catálogo vale até <b>{fmt(s.period_end)}</b>; depois, não dá mais para abrir nem baixar livros novos.</span></li>
            <li><Icon name="download" size={18} /><span>Os PDFs já baixados continuam de vocês ({s.downloads}).</span></li>
            <li><Icon name="x" size={18} /><span>Nenhuma nova cobrança será feita.</span></li>
          </ul>
          <FormError error={error} />
          <div className="acts"><button className="btn btn-main" onClick={onClose}>Quero continuar assinando</button><button className="btn btn-danger-ghost" disabled={busy} onClick={confirm}>{busy ? 'Cancelando…' : 'Cancelar assinatura'}</button></div>
        </div>
      )}
    </Modal>
  )
}
