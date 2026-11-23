// Ficha de box ou coleção, mantendo a diferença entre os dois:
// box = uma história em volumes, com roteiro de leitura em ordem;
// coleção = livros independentes reunidos por autor ou tema, em qualquer ordem.
import { useLibrary } from './library'
import { useShell } from './Shell'
import { Cover, Icon, Modal, StatusTag, Tag } from './ds'
import Rail from './Rail'
import { thumb, byId } from './catalog'

// Arte do grupo; sem arte própria, um mosaico com as capas das obras.
export function GroupArt({ g, className = '' }) {
  if (g.arte) return <img className={`g-art ${className}`} loading="lazy" src={thumb(g.arte)} alt="" />
  return (
    <span className={`g-art g-mosaic ${className}`} aria-hidden="true">
      {g.titulos.slice(0, 3).map((id) => byId[id] && <img key={id} loading="lazy" src={thumb(byId[id].capa)} alt="" className={byId[id].em_breve ? 'eb-img' : ''} />)}
    </span>
  )
}

export default function GroupModal({ g, onClose }) {
  const { bySlug } = useLibrary()
  const { openTitle } = useShell()
  const isBox = g.tipo === 'box'
  const vols = g.titulos.map((id) => byId[id]).filter(Boolean)
  const next = isBox && vols.find((v) => bySlug[v.id]?.status !== 'lido')
  const open = (t) => { onClose(); openTitle(t) }

  return (
    <Modal title={g.titulo} onClose={onClose} wide>
      <GroupArt g={g} className="gm-art" />
      <div className="gm-meta">
        {isBox ? <Tag tone="purple">Box · {vols.length} volumes</Tag> : <Tag tone="blue">Coleção · {vols.length} {vols.length === 1 ? 'livro' : 'livros'}</Tag>}
        <span className="muted sm">{isBox ? 'Leia em ordem' : 'Leia em qualquer ordem'}</span>
      </div>
      {g.descricao && <p className="gm-desc">{g.descricao}</p>}

      {isBox ? (
        <>
          <h3 className="gm-h">Roteiro de leitura</h3>
          <ol className="route">
            {vols.map((v, i) => (
              <li key={v.id}>
                <button onClick={() => open(v)}>
                  <span className="n">{i + 1}</span>
                  <img src={thumb(v.capa)} alt="" className={v.em_breve ? 'eb-img' : ''} />
                  <span className="rt">
                    <b>{v.titulo}</b>
                    <small>{v.sinopse}</small>
                    <span className="rt-tags">
                      <StatusTag status={bySlug[v.id]?.status} />
                      {next?.id === v.id && <Tag tone="purple" icon="play">{i === 0 ? 'Comece por aqui' : 'Próximo'}</Tag>}
                    </span>
                  </span>
                  <Icon name="chev" size={18} />
                </button>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <>
          <h3 className="gm-h">Livros da coleção</h3>
          <div className="gm-rail">
            <Rail>{vols.map((v) => <Cover key={v.id} t={v} status={bySlug[v.id]?.status} onClick={open} />)}</Rail>
          </div>
        </>
      )}
    </Modal>
  )
}
