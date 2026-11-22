import { useCallback, useEffect, useRef, useState } from 'react'

// Carrossel com as mesmas setas da landing: painéis translúcidos e bordas que esmaecem.
const Arrow = ({ dir }) => (
  <svg viewBox="0 0 24 24" style={dir === 'next' ? { transform: 'scaleX(-1)' } : undefined}><path d="M15 5l-7 7 7 7" /></svg>
)

export default function Rail({ children }) {
  const ref = useRef(null)
  const [edge, setEdge] = useState({ l: false, r: false })
  const update = useCallback(() => {
    const t = ref.current
    if (!t) return
    setEdge({ l: t.scrollLeft > 4, r: t.scrollLeft + t.clientWidth < t.scrollWidth - 4 })
  }, [])
  const touched = useRef(false)
  useEffect(() => {
    if (!touched.current && ref.current) ref.current.scrollLeft = 0
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [update, children])
  const go = (d) => (touched.current = true) && ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.85, behavior: 'smooth' })
  return (
    <div className={`rail${edge.l ? ' more-l' : ''}${edge.r ? ' more-r' : ''}`}>
      <button className="arr prev" aria-label="Anteriores" disabled={!edge.l} onClick={() => go(-1)}><Arrow /></button>
      <div className="track" ref={ref} onScroll={update} onPointerDown={() => (touched.current = true)} onWheel={() => (touched.current = true)}>{children}</div>
      <button className="arr next" aria-label="Próximos" disabled={!edge.r} onClick={() => go(1)}><Arrow dir="next" /></button>
    </div>
  )
}
