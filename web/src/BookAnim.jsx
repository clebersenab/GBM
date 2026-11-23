// Livro aberto no fundo do banner. O livro fica parado; só as páginas passam.
// Uma única folha vira por vez (a cada 4 s): na frente, a ilustração que estava à direita;
// no verso, o texto da página seguinte. Por baixo já está a próxima ilustração. Quando a folha
// termina de virar, a abertura nova fica no lugar dela, sem troca de camadas no meio do giro
// (era isso que fazia a animação antiga piscar).
// Com páginas reais (folhear), mostra o próprio livro: ilustração à direita, texto da mesma página à esquerda.
import { useEffect, useMemo, useState } from 'react'

const CROPS = ['46% 70%', '100% 40%', '62% 10%']
const INTERVALO = 4000
const VIRAR = 1100

function Ilus({ it }) {
  return <div className={`bk-ilus${it.real ? ' bk-real' : ''}`} style={{ backgroundImage: `url(${it.imagem})`, backgroundPosition: it.pos }} />
}
function Texto({ it }) {
  if (it.real) return <div className="bk-txt bk-txt-real"><p>{it.texto}</p><small>{it.n}</small></div>
  return (
    <div className="bk-txt">
      {it.seed % 2 === 0 && <b className="bk-cap">{'EOA'[it.seed % 3]}</b>}
      {Array.from({ length: 9 }, (_, i) => <i key={i} style={{ width: `${[92, 100, 96, 88, 100, 94, 70, 98, 60][(i + it.seed * 3) % 9]}%` }} />)}
    </div>
  )
}

export default function BookAnim({ img, folhear }) {
  const itens = useMemo(() => (folhear?.length >= 2
    ? folhear.map((p, k) => ({ real: true, imagem: p.imagem, texto: p.texto, n: p.pagina || k + 1 }))
    : CROPS.map((pos, k) => ({ imagem: img, pos, seed: k + 1 }))), [folhear, img])
  const [k, setK] = useState(0)
  const [vira, setVira] = useState(false)

  useEffect(() => {
    itens.forEach((it) => { new Image().src = it.imagem })
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let fim
    const t = setInterval(() => {
      setVira(true)
      fim = setTimeout(() => { setK((x) => (x + 1) % itens.length); setVira(false) }, VIRAR)
    }, INTERVALO)
    return () => { clearInterval(t); clearTimeout(fim) }
  }, [itens])

  const atual = itens[k % itens.length]
  const prox = itens[(k + 1) % itens.length]
  return (
    <div className="bk" aria-hidden="true">
      <div className="bk-book">
        <div className="bk-page bk-l"><Texto it={atual} /></div>
        <div className="bk-page bk-r"><Ilus it={vira ? prox : atual} /></div>
        {vira && (
          <div className="bk-leaf" style={{ animationDuration: `${VIRAR}ms` }}>
            <div className="bk-face bk-front"><Ilus it={atual} /></div>
            <div className="bk-face bk-back"><Texto it={prox} /></div>
          </div>
        )}
        <div className="bk-spine" />
      </div>
    </div>
  )
}
