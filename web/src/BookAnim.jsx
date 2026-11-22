// Livro aberto no fundo do banner, com as páginas virando sem fim.
// Três folhas giram em ciclo contínuo: cada uma vira da direita para a esquerda e, quando já
// está coberta pela folha seguinte, volta escondida para baixo da pilha da direita.
// Assim nunca há salto visível. Frente da folha: cena da ilustração; verso: texto.
const CROPS = ['46% 70%', '100% 40%', '62% 10%']

function Ilus({ img, pos }) {
  return <div className="bk-ilus" style={{ backgroundImage: `url(${img})`, backgroundPosition: pos }} />
}
function Texto({ seed = 0 }) {
  return (
    <div className="bk-txt">
      {seed % 2 === 0 && <b className="bk-cap">{'EOA'[seed % 3]}</b>}
      {Array.from({ length: 9 }, (_, i) => <i key={i} style={{ width: `${[92, 100, 96, 88, 100, 94, 70, 98, 60][(i + seed * 3) % 9]}%` }} />)}
    </div>
  )
}

export default function BookAnim({ img }) {
  return (
    <div className="bk" aria-hidden="true">
      <div className="bk-float">
        <div className="bk-book">
          <div className="bk-page bk-l"><Texto seed={5} /></div>
          <div className="bk-page bk-r"><Ilus img={img} pos={CROPS[0]} /></div>
          {[0, 1, 2].map((n) => (
            <div key={n} className={`bk-leaf bk-leaf${n + 1}`}>
              <div className="bk-face bk-front"><Ilus img={img} pos={CROPS[n]} /></div>
              <div className="bk-face bk-back"><Texto seed={n + 1} /></div>
            </div>
          ))}
          <div className="bk-spine" />
        </div>
      </div>
    </div>
  )
}
