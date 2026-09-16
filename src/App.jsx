import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'

const SEG_COLORS = ['#1a0000', '#c0392b']
const SEG_TEXTS  = ['#fff', '#fff']
const DOT_COLORS = ['#e74c3c', '#c0392b']

const DEFAULT_SEGMENTS = [
  'ADM',
  'CONTÁBEIS',
  'EMPREENDEDORISMO',
  'RH',
  'GESTÃO E FINANÇAS',
  'ADM',
  'CONTÁBEIS',
  'EMPREENDEDORISMO',
  'RH',
  'GESTÃO E FINANÇAS',
  'TENTE OUTRA VEZ',
]

const BASE    = 440
const BULBS   = 32

function computeWheelSize(segs) {
  if (segs.length === 0) return BASE
  const maxLen = Math.max(...segs.map(s => s.length))
  if (maxLen > 24) return 700
  if (maxLen > 18) return 600
  if (maxLen > 12) return 520
  return BASE
}

function easeOut(t) { return 1 - Math.pow(1 - t, 4) }

function getResultIdx(finalAngle, n) {
  const ARC    = (2 * Math.PI) / n
  const offset = ((-Math.PI / 2 - finalAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
  return Math.floor(offset / ARC) % n
}

export default function App() {
  const [segments, setSegments]     = useState(DEFAULT_SEGMENTS)
  const [wheelSize, setWheelSize]   = useState(() => computeWheelSize(DEFAULT_SEGMENTS))
  const [lastResult, setLastResult] = useState('Aguardando...')
  const [history, setHistory]       = useState([])
  const [newSeg, setNewSeg]         = useState('')
  const [editIdx, setEditIdx]       = useState(null)
  const [editVal, setEditVal]       = useState('')
  const [spinning, setSpinning]     = useState(false)
  const [showEditor, setShowEditor] = useState(false)

  const canvasRef    = useRef(null)
  const angleRef     = useRef(0)
  const spinRef      = useRef(false)
  const idleTRef     = useRef(0)
  const rafRef       = useRef(null)
  const logoRef      = useRef(null)
  const segsRef      = useRef(segments)
  const wheelSizeRef = useRef(wheelSize)

  useEffect(() => { segsRef.current = segments }, [segments])

  useEffect(() => {
    const img = new Image()
    img.src = '/img/logo.jpg'
    logoRef.current = img
  }, [])

  const draw = useCallback((angle, t = 0) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx  = canvas.getContext('2d')
    const segs = segsRef.current
    const N    = segs.length
    const ARC  = N > 0 ? (2 * Math.PI) / N : 2 * Math.PI

    const sz    = wheelSizeRef.current
    const cx    = sz / 2
    const cy    = sz / 2
    const scale = sz / BASE
    const rOut  = Math.round(210 * scale)
    const rBulb = Math.round(220 * scale)
    const rIn   = Math.round(60  * scale)

    ctx.clearRect(0, 0, sz, sz)

    // anel externo dourado
    ctx.beginPath()
    ctx.arc(cx, cy, rOut + 12, 0, 2 * Math.PI)
    ctx.fillStyle   = '#7a0000'
    ctx.fill()
    ctx.strokeStyle = '#e74c3c'
    ctx.lineWidth   = 3
    ctx.stroke()

    if (N === 0) {
      ctx.fillStyle = '#333'
      ctx.font      = 'bold 14px Segoe UI'
      ctx.textAlign = 'center'
      ctx.fillText('Adicione itens →', cx, cy)
    } else {
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, rOut, 0, 2 * Math.PI)
      ctx.clip()

      for (let i = 0; i < N; i++) {
        const start = angle + i * ARC
        const end   = start + ARC

        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, rOut, start, end)
        ctx.closePath()
        ctx.fillStyle   = SEG_COLORS[i % 2]
        ctx.fill()
        ctx.strokeStyle = '#e74c3c'
        ctx.lineWidth   = 2
        ctx.stroke()

        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(start + ARC / 2)
        ctx.textAlign   = 'right'
        ctx.fillStyle   = SEG_TEXTS[i % 2]
        const baseFont  = N > 12 ? 14 : N > 8 ? 18 : 26
        const labelLen  = segs[i].length
        const shrink    = labelLen > 24 ? 0.42 : labelLen > 14 ? 0.58 : labelLen > 10 ? 0.74 : labelLen > 7 ? 0.88 : 1
        let fontSize    = Math.max(9, Math.round(baseFont * shrink * scale))
        ctx.font        = `bold ${fontSize}px Segoe UI`

        const maxChars = N > 10 ? 12 : 14
        const words    = segs[i].split(' ')
        let lines = [], cur = ''
        for (const w of words) {
          const test = cur ? cur + ' ' + w : w
          if (test.length > maxChars && cur) { lines.push(cur); cur = w }
          else cur = test
        }
        if (cur) lines.push(cur)
        if (lines.length > 3) lines = [lines.slice(0, -1).join(' '), lines[lines.length - 1]]

        const maxWidth    = rOut - rIn - Math.round(28 * scale)
        const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b, '')
        const measured    = ctx.measureText(longestLine).width
        if (measured > maxWidth) {
          fontSize = Math.max(9, Math.floor(fontSize * maxWidth / measured))
          ctx.font = `bold ${fontSize}px Segoe UI`
        }

        ctx.shadowColor = '#000'
        ctx.shadowBlur  = 5

        const lineH = fontSize + 3
        const tx    = rOut - Math.round(12 * scale)
        const ty    = -(lines.length - 1) * lineH / 2
        lines.forEach((line, li) => ctx.fillText(line, tx, ty + li * lineH))

        ctx.shadowBlur = 0
        ctx.restore()
      }

      ctx.restore()
    }

    // hub central
    ctx.beginPath()
    ctx.arc(cx, cy, rIn + Math.round(8 * scale), 0, 2 * Math.PI)
    ctx.fillStyle   = '#0a0a0a'
    ctx.fill()
    ctx.strokeStyle = '#f1c40f'
    ctx.lineWidth   = 3
    ctx.stroke()

    const logo = logoRef.current
    if (logo && logo.complete && logo.naturalWidth > 0) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, rIn, 0, 2 * Math.PI)
      ctx.clip()
      ctx.drawImage(logo, cx - rIn, cy - rIn, rIn * 2, rIn * 2)
      ctx.restore()
    } else {
      ctx.beginPath()
      ctx.arc(cx, cy, rIn, 0, 2 * Math.PI)
      ctx.fillStyle = '#c0392b'
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font      = `bold ${Math.round(13 * scale)}px Segoe UI`
      ctx.textAlign = 'center'
      ctx.fillText('CR', cx, cy + 5)
    }

    // lâmpadas
    for (let i = 0; i < BULBS; i++) {
      const a  = (2 * Math.PI * i) / BULBS + t * 0.4
      const x  = cx + rBulb * Math.cos(a)
      const y  = cy + rBulb * Math.sin(a)
      const on = (Math.floor(t * 3 + i) % 2 === 0)
      ctx.beginPath()
      ctx.arc(x, y, Math.round(5.5 * scale), 0, 2 * Math.PI)
      ctx.fillStyle = on ? '#ff4444' : '#4a0000'
      ctx.fill()
      if (on) {
        ctx.shadowColor = '#ff4444'
        ctx.shadowBlur  = 10
        ctx.fill()
        ctx.shadowBlur  = 0
      }
    }
  }, [])

  // loop idle
  useEffect(() => {
    const tick = () => {
      if (!spinRef.current) {
        idleTRef.current += 0.02
        draw(angleRef.current, idleTRef.current)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  // atualiza tamanho e redesenha quando segmentos mudam
  useEffect(() => {
    const newSize = computeWheelSize(segments)
    wheelSizeRef.current = newSize
    setWheelSize(newSize)
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width  = newSize
      canvas.height = newSize
    }
    if (!spinRef.current) draw(angleRef.current, idleTRef.current)
  }, [segments, draw])

  const handleSpin = () => {
    if (spinRef.current || segsRef.current.length < 2) return
    spinRef.current = true
    setSpinning(true)

    const totalRot   = 2 * Math.PI * (5 + Math.random() * 5) + Math.random() * 2 * Math.PI
    const duration   = 4000 + Math.random() * 1500
    const startAngle = angleRef.current
    const startTime  = performance.now()
    let bulbT = 0

    const animate = (now) => {
      const elapsed  = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      angleRef.current = startAngle + totalRot * easeOut(progress)
      bulbT = elapsed / 200
      draw(angleRef.current, bulbT)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        spinRef.current = false
        setSpinning(false)
        const segs  = segsRef.current
        const label = segs[getResultIdx(angleRef.current, segs.length)]
        setLastResult(label)
        setHistory(h => [label, ...h].slice(0, 30))
      }
    }

    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(animate)
  }

  const addSeg = () => {
    const val = newSeg.trim()
    if (!val) return
    setSegments(s => [...s, val])
    setNewSeg('')
  }

  const deleteSeg = (i) => {
    setEditIdx(null)
    setSegments(s => s.filter((_, idx) => idx !== i))
  }

  const startEdit = (i) => { setEditIdx(i); setEditVal(segments[i]) }

  const saveEdit = () => {
    if (editVal.trim()) setSegments(s => s.map((seg, i) => i === editIdx ? editVal.trim() : seg))
    setEditIdx(null)
  }

  return (
    <>
      <nav>
        <img src="/img/logo.jpg" className="nav-logo" alt="Mascote CR" />
        <div className="nav-links">
          <a href="#" className="active">Home</a>
          <a href="#" onClick={e => { e.preventDefault(); setShowEditor(true) }}>Editar Roleta</a>
        </div>
      </nav>

      {showEditor && (
        <div className="modal-overlay" onClick={() => setShowEditor(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>✏️ Editar Roleta</span>
              <button className="btn-icon btn-del" onClick={() => setShowEditor(false)}>✕</button>
            </div>
            <div className="editor-body">
              <div className="add-row">
                <input
                  value={newSeg}
                  onChange={e => setNewSeg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSeg()}
                  placeholder="Nome ou número do item..."
                  maxLength={40}
                />
                <button className="btn-add" onClick={addSeg}>+</button>
              </div>
              <div className="seg-list">
                {segments.length === 0
                  ? <div className="empty-msg">Nenhum item. Adicione acima.</div>
                  : segments.map((seg, i) => (
                      <div className="seg-item" key={i}>
                        <span className="seg-dot" style={{ background: DOT_COLORS[i % 2] }} />
                        {editIdx === i
                          ? <input
                              className="seg-edit-input"
                              value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveEdit()}
                              autoFocus
                            />
                          : <span className="seg-label">{seg}</span>
                        }
                        {editIdx === i
                          ? <button className="btn-icon btn-ok" onClick={saveEdit}>✓</button>
                          : <button className="btn-icon btn-ed" onClick={() => startEdit(i)}>✏️</button>
                        }
                        <button className="btn-icon btn-del" onClick={() => deleteSeg(i)}>✕</button>
                      </div>
                    ))
                }
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="main">
        {/* Roda */}
        <div className="wheel-area">
          <div className="wheel-wrapper" style={{ width: wheelSize, height: wheelSize }}>
            <div className="pointer" />
            <canvas ref={canvasRef} width={wheelSize} height={wheelSize} />
          </div>
          <button
            className="btn-girar"
            onClick={handleSpin}
            disabled={spinning || segments.length < 2}
          >
            GIRAR
          </button>
        </div>

        {/* Painel lateral */}
        <div className="side-panels">

          <div className="last-result-card">
            <h4>Último resultado</h4>
            <div className="result-text">{lastResult}</div>
          </div>

          <div className="panel-card">
            <div className="panel-header">Histórico de Giros</div>
            <div className="history-list">
              {history.length === 0
                ? <div className="result-item"><span className="name empty">Nenhum giro ainda</span></div>
                : history.map((item, i) => (
                    <div className="result-item" key={i}>
                      <span className="rank">{i + 1}</span>
                      <span className="name">{item}</span>
                    </div>
                  ))
              }
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
