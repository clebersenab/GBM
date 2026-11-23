import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Card, Cover, Empty, Icon, PageHead, Progress, Ring, Segmented, Stat, StatusTag, Tag, Toggle } from '../ds'
import { Field } from '../ui'
import { byId } from '../catalog'

// Referência viva do design system da plataforma. Tudo aqui usa os mesmos componentes das telas.
const COLORS = [
  ['--orange', 'Ação', 'Botão principal, item ativo do menu, "lendo"'], ['--blue', 'Descoberta', 'Jornadas, "quero ler", foco do teclado'],
  ['--purple', 'Boxes', 'Boxes, recomendações'], ['--green', 'Concluído', '"Lido", sucesso'], ['--red', 'Atenção', 'Erros, cancelar'],
  ['--bg', 'Fundo', ''], ['--bg2', 'Superfície', 'Menu, barra superior, modais'], ['--card', 'Cartão', 'Widgets'], ['--ink', 'Texto', ''], ['--mute', 'Texto de apoio', ''], ['--line', 'Divisória', ''],
]

export default function DesignSystem() {
  const [seg, setSeg] = useState('a')
  const [on, setOn] = useState(true)
  return (
    <div className="page">
      <PageHead title="Design system" sub="Menu superior com 4 abas (barra de abas embaixo no celular), busca e menu da foto à direita, widgets em cartões. Muda junto com o tema claro/escuro." />
      <Card title="Leitor" sub="Fundo creme, fonte Andika, letra 22/28/30px com A−/A+, uma ilustração por página e texto sempre fora da imagem. Fixo, não muda com o tema.">
        <Link className="btn btn-main" to="/ler/demo-leitor"><Icon name="book" size={18} />Abrir o livro de amostra</Link>
      </Card>
      <Card title="Cores" sub="Sempre por variável: o tema troca os valores, não os nomes">
        <div className="ds-colors">{COLORS.map(([v, n, use]) => (
          <div key={v}><i style={{ background: `var(${v})` }} /><b>{n}</b><code>{v}</code>{use && <small>{use}</small>}</div>
        ))}</div>
      </Card>
      <div className="grid-2">
        <Card title="Tipografia">
          <div className="ds-type">
            <h1>Título de página · Poppins 28–34</h1>
            <h3 className="ds-h3">Título de cartão · Poppins 17</h3>
            <p>Texto corrido · Nunito Sans 16, entrelinha 1,55.</p>
            <p className="muted sm">Apoio · Nunito Sans 14, cor --mute</p>
            <p className="eyebrow">Sobretítulo · 13 caixa-alta</p>
            <span className="ds-row"><a className="nav-a active">Aba ativa</a><a className="nav-a">Aba</a></span>
          </div>
        </Card>
        <Card title="Espaço, raio e sombra">
          <div className="ds-tokens">
            {[['--sp-1', 4], ['--sp-2', 8], ['--sp-3', 12], ['--sp-4', 16], ['--sp-5', 24], ['--sp-6', 32]].map(([k, v]) => <div key={k}><i style={{ width: v * 2 }} /><code>{k} · {v}px</code></div>)}
            <div className="ds-radii">{[['--r-sm', 8], ['--r-md', 12], ['--r-lg', 18], ['--r-xl', 24]].map(([k, v]) => <span key={k} style={{ borderRadius: v }}><code>{k}</code></span>)}</div>
          </div>
        </Card>
      </div>
      <div className="grid-2">
        <Card title="Botões">
          <div className="ds-row">
            <button className="btn btn-main"><Icon name="play" size={18} />Principal</button>
            <button className="btn btn-ghost">Secundário</button>
            <button className="btn btn-sm btn-main">Pequeno</button>
            <button className="btn btn-sm btn-ghost"><Icon name="edit" size={16} />Com ícone</button>
            <button className="btn btn-sm btn-danger-ghost">Destrutivo</button>
          </div>
        </Card>
        <Card title="Etiquetas, selos e status">
          <div className="ds-row">
            <StatusTag status="quero_ler" /><StatusTag status="lendo" /><StatusTag status="lido" />
            <Tag tone="purple" icon="sparkle">Para você</Tag><Tag tone="orange" icon="star">Coragem</Tag><Tag>Neutra</Tag><Badge>3</Badge>
          </div>
        </Card>
      </div>
      <Card title="Indicadores">
        <div className="stats">
          <Stat icon="check" tone="green" value={12} label="Lidos" /><Stat icon="book" tone="orange" value={2} label="Lendo" />
          <Stat icon="bookmark" tone="blue" value={5} label="Quero ler" /><Stat icon="sprout" tone="purple" value="4/7" label="Valores plantados" />
        </div>
      </Card>
      <div className="grid-3">
        <Card title="Progresso"><div className="stack"><Progress value={2} max={3} tone="purple" label="Box A Família" right="2/3" /><Progress value={60} tone="orange" label="Leitura" /><Progress value={90} tone="green" label="Meta do mês" /></div></Card>
        <Card title="Anel"><div className="ds-center"><Ring value={4} max={7} label="plantados" size={130} /></div></Card>
        <Card title="Controles">
          <div className="stack">
            <Segmented label="Exemplo" value={seg} onChange={setSeg} options={[{ value: 'a', label: 'Todos', count: 8 }, { value: 'b', label: 'Lendo', count: 2 }, { value: 'c', label: 'Lidos' }]} />
            <Toggle checked={on} onChange={setOn}>Interruptor</Toggle>
            <Field label="Campo" placeholder="Digite aqui" />
          </div>
        </Card>
      </div>
      <div className="grid-2">
        <Card title="Capa" sub="Com status e linha de apoio">
          <div className="ds-row">
            {byId['moby-dick'] && <Cover t={byId['moby-dick']} status="lido" note="Cultiva Coragem" onClick={() => {}} />}
            {byId['ze-candeia'] && <Cover t={byId['ze-candeia']} status="lendo" note="Próximo do box" onClick={() => {}} />}
          </div>
        </Card>
        <Card title="Estado vazio"><Empty icon="bookmark" title="A lista está vazia" action={<button className="btn btn-sm btn-main">Explorar</button>}>Uma frase curta dizendo o que fazer.</Empty></Card>
      </div>
    </div>
  )
}
