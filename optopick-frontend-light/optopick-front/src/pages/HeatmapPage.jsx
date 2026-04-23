import { useState, useEffect, useMemo } from 'react'
import { api } from '../api/client'
import { S } from '../components/styles'
import { Loading, ErrorBox, EmptyState } from '../components/Widgets'
import { Map, Zap, Circle, Trophy, ClipboardList, Calendar, BarChart, Flame, MousePointer2, AlertTriangle } from 'lucide-react'

/* ── Heat color scale ────────────────────────────── */

const heat = (picks, max) => {
  if (!picks || !max) return null
  const f = picks / max
  if (f > 0.75) return { fill:'#FEE2E2', border:'#DC2626', text:'#991B1B', label:'Très chaud' }
  if (f > 0.50) return { fill:'#FFEDD5', border:'#EA580C', text:'#9A3412', label:'Chaud'      }
  if (f > 0.25) return { fill:'#FEF9C3', border:'#CA8A04', text:'#713F12', label:'Tiède'      }
  if (f > 0.08) return { fill:'#DCFCE7', border:'#16A34A', text:'#14532D', label:'Frais'      }
  return              { fill:'#DBEAFE', border:'#2563EB', text:'#1E3A8A', label:'Froid'      }
}

/* ── Geometry parser ─────────────────────────────── */

function parseGeometry(geo, pickData) {
  // ── 1. Auto-detect from pick data (fallback) ──
  if (!geo || (!geo.vertical_racks && !geo.pairs)) {
    if (!pickData?.cells?.length) return { pairs: [], horizontalRacks: [], nbCols: 0, groups: [] }
    const rackMap = {}
    pickData.cells.forEach(c => {
      if (!rackMap[c.rack]) rackMap[c.rack] = 0
      rackMap[c.rack] = Math.max(rackMap[c.rack], c.column)
    })
    const rackNames = Object.keys(rackMap).sort()
    const pairs = []
    let i = 0
    while (i < rackNames.length) {
      if (i + 1 < rackNames.length) {
        pairs.push({
          left:  { name: rackNames[i],   cols: rackMap[rackNames[i]],   face: 'left' },
          right: { name: rackNames[i+1], cols: rackMap[rackNames[i+1]], face: 'right' },
        })
        i += 2
      } else {
        pairs.push({
          left:  { name: rackNames[i], cols: rackMap[rackNames[i]], face: 'left' },
          right: null,
        })
        i += 1
      }
    }
    const nbCols = Math.max(...Object.values(rackMap), 1)
    return { pairs, horizontalRacks: [], nbCols, groups: [], autoDetected: true }
  }

  // ── 2. New format: { vertical_racks, horizontal_racks } ──
  if (geo.vertical_racks) {
    const vr = geo.vertical_racks
    const pairs = []
    let i = 0
    while (i < vr.length) {
      const curr = vr[i]
      const next = vr[i + 1]
      if (curr.face === 'left' && next && next.face === 'right') {
        pairs.push({ left: curr, right: next })
        i += 2
      } else {
        pairs.push({ left: curr, right: null })
        i += 1
      }
    }
    const nbCols = vr.length > 0 ? Math.max(...vr.map(r => r.cols || 18)) : 18
    const horizontalRacks = geo.horizontal_racks || []

    // Extract unique groups in order
    const seenGroups = new Set()
    const groups = []
    vr.forEach(r => {
      const g = r.group || null
      if (g && !seenGroups.has(g)) { seenGroups.add(g); groups.push(g) }
    })

    return { pairs, horizontalRacks, nbCols, groups }
  }

  // ── 3. Legacy: { nb_cols, pairs } ──
  if (geo.pairs) {
    const pairs = geo.pairs.map(p => ({
      left:  { name: p[0], cols: geo.nb_cols || 18, face: 'left' },
      right: p[1] ? { name: p[1], cols: geo.nb_cols || 18, face: 'right' } : null,
    }))
    return { pairs, horizontalRacks: [], nbCols: geo.nb_cols || 18, groups: [] }
  }

  return { pairs: [], horizontalRacks: [], nbCols: 18, groups: [] }
}

/** Get display label for a rack */
const rackLabel = (rack) => rack.short_name || rack.name

/** Compute adaptive cell size based on rack/column count */
function cellSize(totalRacks, nbCols) {
  // Target: fill ~800px width for the grid area
  const maxW = Math.max(8, Math.min(24, Math.floor(760 / Math.max(totalRacks, 1))))
  const maxH = Math.max(8, Math.min(18, Math.floor(500 / Math.max(nbCols, 1))))
  return { w: maxW, h: maxH, fontSize: Math.max(4, Math.min(6, maxW - 2)) }
}

/* ── Main Component ──────────────────────────────── */

export default function HeatmapPage() {
  const [warehouses, setWarehouses] = useState([])
  const [selectedWh, setSelectedWh] = useState('')
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [selRack,    setSelRack]    = useState(null)
  const [hovered,    setHovered]    = useState(null)
  const [tab,        setTab]        = useState('carte')

  useEffect(() => {
    api.warehouses.list().then(w => { setWarehouses(w); if (w.length===1) setSelectedWh(String(w[0].id)) })
  }, [])

  useEffect(() => {
    if (!selectedWh) return
    setLoading(true); setError(''); setData(null); setSelRack(null)
    api.heatmap.get(parseInt(selectedWh))
      .then(setData).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [selectedWh])

  const selectedWarehouse = warehouses.find(w => String(w.id) === selectedWh)
  const geo = useMemo(() => parseGeometry(selectedWarehouse?.geometry_json, data), [selectedWarehouse, data])

  // Compute total rack count for adaptive sizing
  const totalRackSlots = geo.pairs.reduce((n, p) => n + (p.left ? 1 : 0) + (p.right ? 1 : 0), 0)
  const cs = cellSize(totalRackSlots, geo.nbCols)

  const cellMap = {}
  const rackTotals = data?.rack_totals || {}
  if (data?.cells) data.cells.forEach(c => { if (!cellMap[c.rack]) cellMap[c.rack]={}; cellMap[c.rack][c.column]=c.picks })
  const getPicks  = (rack, col) => cellMap[rack]?.[col] || 0
  const maxPicks  = data ? Math.max(...data.cells.map(c=>c.picks), 1) : 1
  const maxRack   = data ? Math.max(...Object.values(rackTotals), 1) : 1
  const total     = data?.total_picks || 0
  const selCols   = selRack ? cellMap[selRack]||{} : {}
  const selTotal  = selRack ? rackTotals[selRack]||0 : 0
  const selMax    = Object.values(selCols).length ? Math.max(...Object.values(selCols)) : 1

  const getColsForRack = (rackName) => {
    for (const p of geo.pairs) {
      if (p.left?.name === rackName) return p.left.cols || geo.nbCols
      if (p.right?.name === rackName) return p.right.cols || geo.nbCols
    }
    for (const hr of geo.horizontalRacks) {
      if (hr.name === rackName) return hr.cols || geo.nbCols
    }
    return geo.nbCols
  }

  // Group pairs by group name
  const groupedPairs = useMemo(() => {
    if (!geo.groups.length) return [{ group: null, pairs: geo.pairs }]
    const result = []
    let currentGroup = null
    let currentBucket = []
    geo.pairs.forEach(p => {
      const g = p.left?.group || null
      if (g !== currentGroup && currentBucket.length) {
        result.push({ group: currentGroup, pairs: currentBucket })
        currentBucket = []
      }
      currentGroup = g
      currentBucket.push(p)
    })
    if (currentBucket.length) result.push({ group: currentGroup, pairs: currentBucket })
    return result
  }, [geo])

  const tabStyle = (k) => ({
    padding:'6px 16px', borderRadius:7, border:`1px solid ${tab===k ? S.blue : S.divider}`,
    fontSize:10, cursor:'pointer', fontFamily:S.font, transition:'all 0.15s',
    background: tab===k ? '#EFF6FF' : S.white,
    color: tab===k ? S.blue : S.dim, fontWeight: tab===k ? 600 : 400,
  })

  const renderHorizontalRack = (hr) => {
    const cols = hr.cols || geo.nbCols
    return (
      <div key={hr.name} style={{ display:'flex', alignItems:'center', gap:8, marginBottom: hr.position === 'start' ? 10 : 0, marginTop: hr.position === 'end' ? 10 : 0 }}>
        <div style={{ width:28, flexShrink:0 }}/>
        <div style={{ flex:1, background:S.white, border:`1.5px solid ${S.blue}44`, borderRadius:6, padding:'4px 8px' }}>
          <div style={{ fontSize:Math.max(6, cs.fontSize), color:S.blue, fontWeight:700, marginBottom:4, textAlign:'center' }}>{hr.short_name || hr.name}</div>
          <div style={{ display:'flex', gap:1 }}>
            {Array.from({ length: cols }, (_, ci) => {
              const col = ci + 1
              const p = getPicks(hr.name, col)
              const h = heat(p, maxPicks)
              return (
                <div key={ci}
                  onMouseEnter={() => setHovered({rack:hr.name, col, picks:p})}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelRack(prev => prev===hr.name ? null : hr.name)}
                  style={{
                    flex:1, height: cs.h, borderRadius:2, cursor:'pointer',
                    background: h ? h.fill : '#F8FAFC',
                    border:`1px solid ${h ? h.border+'88' : selRack===hr.name ? S.blue : S.divider}`,
                    outline: selRack===hr.name ? `2px solid ${S.blue}33` : 'none',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                  {p > 0 && <span style={{ fontSize:cs.fontSize-1, color:h?.text||S.dim, fontWeight:700, pointerEvents:'none' }}>{p}</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  /** Render a vertical rack group block */
  const renderPairsBlock = (pairs, blockIdx) => (
    <div key={blockIdx} style={{ display:'flex', alignItems:'center' }}>
      {pairs.map((pair, pi) => (
        <div key={pi} style={{ display:'flex', alignItems:'center' }}>
          {pi > 0 && <div style={{ width: Math.max(4, cs.w * 0.4), flexShrink:0, height: cs.h, display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:1, height:'80%', background:S.divider }}/></div>}
          {[pair.left, pair.right].filter(Boolean).map((rack, ri) => {
            const rackCols = rack.cols || geo.nbCols
            const col = arguments[2] // this is the current column being rendered — handled by caller
            // This is just the structural container; actual cells are rendered per-row by the caller
            return null
          })}
        </div>
      ))}
    </div>
  )

  return (
    <div>
      {/* Sélecteur */}
      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:18 }}>
        <select value={selectedWh} onChange={e => { setSelectedWh(e.target.value); setSelRack(null) }}
          style={{ padding:'9px 13px', borderRadius:8, fontSize:11, fontFamily:S.font,
            background:S.white, border:`1.5px solid ${S.divider}`, color:S.dark, outline:'none', cursor:'pointer' }}>
          <option value=''>-- Choisir un entrepôt --</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        {data && <div style={{ fontSize:10, color:S.dim, fontWeight:500 }}>{total.toLocaleString()} picks · {Object.keys(rackTotals).length} racks actifs</div>}
        {geo.autoDetected && data && (
          <div style={{ fontSize:9, color:'#CA8A04', background:'#FEFCE8', border:'1px solid #FDE68A', padding:'3px 10px', borderRadius:6, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
            <AlertTriangle size={12} /> Géométrie auto-détectée
          </div>
        )}
      </div>

      {loading && <Loading text='Calcul de la heatmap...' />}
      {error   && <ErrorBox message={error} />}
      {!loading && !data && !error && <EmptyState icon={<Map size={48} strokeWidth={1.5} color={S.dimmer} />} text='Sélectionnez un entrepôt' sub='La heatmap apparaîtra ici' />}

      {data && (
        <>
          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:18 }}>
            {[
              { icon:<Zap size={18} color="#1E40AF" />, l:'Total picks',     v:total.toLocaleString(), c:'#1E40AF', bg:'#EFF6FF' },
              { icon:<Circle fill="#DC2626" size={18} color="#DC2626" />, l:'Record',          v:`${maxPicks} picks`,    c:'#DC2626', bg:'#FEF2F2' },
              { icon:<Trophy size={18} color="#EA580C" />, l:'Rack le + actif', v:Object.entries(rackTotals).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—', c:'#EA580C', bg:'#FFF7ED' },
              { icon:<ClipboardList size={18} color="#7C3AED" />, l:'Racks actifs',    v:Object.keys(rackTotals).length, c:'#7C3AED', bg:'#F5F3FF' },
              { icon:<Calendar size={18} color="#16A34A" />, l:'Jours actifs',    v:Object.keys(data.date_picks||{}).length, c:'#16A34A', bg:'#F0FDF4' },
            ].map((k,i) => (
              <div key={i} style={{ padding:'12px 14px', borderRadius:10, background:k.bg,
                border:`1px solid ${k.c}22`, boxShadow:S.shadow }}>
                <div style={{ fontSize:16, marginBottom:4 }}>{k.icon}</div>
                <div style={{ fontSize:14, fontWeight:700, color:k.c }}>{k.v}</div>
                <div style={{ fontSize:8.5, color:S.dim, marginTop:2 }}>{k.l}</div>
              </div>
            ))}
          </div>

          {/* Onglets */}
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {[{k:'carte',l:<div style={{display:'flex', alignItems:'center', gap:6}}><Map size={14} /> Carte</div>},
              {k:'picks',l:<div style={{display:'flex', alignItems:'center', gap:6}}><BarChart size={14} /> Picks par rack</div>},
              {k:'calendrier',l:<div style={{display:'flex', alignItems:'center', gap:6}}><Calendar size={14} /> Calendrier</div>}
             ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)} style={tabStyle(t.k)}>{t.l}</button>
            ))}
          </div>

          {/* ═══════ CARTE ═══════ */}
          {tab==='carte' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 270px', gap:14 }}>
              <div style={{ background:S.white, border:`1px solid ${S.divider}`, borderRadius:13, padding:'14px 16px', boxShadow:S.shadow, overflowX:'auto' }}>
                <div style={{ fontSize:8.5, color:S.dimmer, letterSpacing:'0.07em', marginBottom:10 }}>
                  COL.1 = RÉCEPTION · COL.{geo.nbCols} = FOND DE CELLULE
                </div>

                {/* Horizontal racks at the top */}
                {geo.horizontalRacks.filter(hr => hr.position === 'start').map(hr => renderHorizontalRack(hr))}

                {/* Rack name labels row */}
                <div style={{ display:'flex', alignItems:'flex-end', marginBottom:4 }}>
                  <div style={{ width:28, flexShrink:0 }}/>
                  {groupedPairs.map((gp, gi) => (
                    <div key={gi} style={{ display:'flex', alignItems:'flex-end' }}>
                      {gi > 0 && <div style={{ width: Math.max(12, cs.w), flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <div style={{ width:2, height:16, background:S.blue+'44', borderRadius:1 }}/>
                      </div>}
                      {gp.pairs.map((pair, pi) => (
                        <div key={pi} style={{ display:'flex', alignItems:'flex-end' }}>
                          {pi > 0 && <div style={{ width: Math.max(4, cs.w * 0.4), flexShrink:0 }}/>}
                          {[pair.left, pair.right].filter(Boolean).map((r, ri) => (
                            <div key={r.name}>
                              {ri === 1 && <div style={{ width: Math.max(2, cs.w * 0.12), flexShrink:0 }}/>}
                              <div onClick={() => setSelRack(p => p===r.name ? null : r.name)} style={{
                                width: cs.w, textAlign:'center', fontSize: Math.max(5.5, cs.fontSize), cursor:'pointer',
                                fontWeight: selRack===r.name ? 700 : 500,
                                color: selRack===r.name ? S.blue : heat(rackTotals[r.name]||0,maxRack)?.border || S.dimmer,
                                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                              }}>
                                {rackLabel(r)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Grid rows */}
                {Array.from({length: geo.nbCols}, (_, ci) => {
                  const col = geo.nbCols - ci
                  return (
                    <div key={col} style={{ display:'flex', alignItems:'center', marginBottom: Math.max(1, cs.h * 0.1) }}>
                      <div style={{ width:28, flexShrink:0, fontSize:Math.max(5.5, cs.fontSize), color:S.dimmer, textAlign:'right', paddingRight:5 }}>c.{col}</div>
                      {groupedPairs.map((gp, gi) => (
                        <div key={gi} style={{ display:'flex', alignItems:'center' }}>
                          {/* Zone separator */}
                          {gi > 0 && <div style={{ width: Math.max(12, cs.w), flexShrink:0, height: cs.h, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <div style={{ width:2, height:'100%', background:S.blue+'33', borderRadius:1 }}/>
                          </div>}
                          {gp.pairs.map((pair, pi) => (
                            <div key={pi} style={{ display:'flex', alignItems:'center' }}>
                              {/* Aisle separator between pairs */}
                              {pi > 0 && <div style={{ width: Math.max(4, cs.w * 0.4), flexShrink:0, height: cs.h, display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:1, height:'80%', background:S.divider }}/></div>}
                              {[pair.left, pair.right].filter(Boolean).map((rack, ri) => {
                                const rackCols = rack.cols || geo.nbCols
                                const p   = col <= rackCols ? getPicks(rack.name, col) : -1
                                const h   = p > 0 ? heat(p, maxPicks) : null
                                const hov = hovered?.rack===rack.name && hovered?.col===col
                                if (p === -1) {
                                  return (
                                    <div key={rack.name}>
                                      {ri === 1 && <div style={{ width: Math.max(2, cs.w * 0.12), flexShrink:0, height: cs.h }}/>}
                                      <div style={{ width: cs.w, height: cs.h }}/>
                                    </div>
                                  )
                                }
                                return (
                                  <div key={rack.name}>
                                    {ri === 1 && <div style={{ width: Math.max(2, cs.w * 0.12), flexShrink:0, height: cs.h, display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:1, height:'100%', background:S.divider }}/></div>}
                                    <div onMouseEnter={() => setHovered({rack:rack.name,col,picks:p})} onMouseLeave={() => setHovered(null)}
                                      onClick={() => setSelRack(prev => prev===rack.name?null:rack.name)}
                                      style={{
                                        width: cs.w, height: cs.h, borderRadius: Math.max(2, cs.w * 0.12), cursor:'pointer',
                                        background: h ? h.fill : '#F8FAFC',
                                        border:`1px solid ${h ? h.border+'88' : selRack===rack.name ? S.blue : S.divider}`,
                                        outline: selRack===rack.name ? `2px solid ${S.blue}33` : 'none',
                                        transform: hov ? 'scaleY(1.15)' : 'scaleY(1)', transition:'all 0.08s',
                                        display:'flex', alignItems:'center', justifyContent:'center',
                                      }}>
                                      {p>0 && <span style={{ fontSize: cs.fontSize - 1, color:h?.text||S.dim, fontWeight:700, lineHeight:1, pointerEvents:'none' }}>{p}</span>}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )
                })}

                {/* Zone legends (if groups exist) */}
                {geo.groups.length > 0 && (
                  <div style={{ display:'flex', gap:12, marginTop:10, paddingTop:8, borderTop:`1px solid ${S.divider}` }}>
                    {groupedPairs.filter(gp => gp.group).map((gp, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ width:10, height:10, borderRadius:2, background:S.blue+'22', border:`1.5px solid ${S.blue}66` }}/>
                        <span style={{ fontSize:8.5, color:S.dim, fontWeight:600 }}>{gp.group}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Réception */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
                  <div style={{ width:28, flexShrink:0 }}/>
                  <div style={{ flex:1, padding:'7px 10px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:6, textAlign:'center', fontSize:10, color:'#16A34A', fontWeight:600 }}>
                    ▲ ZONE RÉCEPTION / EXPÉDITION ▲
                  </div>
                </div>

                {/* Horizontal racks at the bottom */}
                {geo.horizontalRacks.filter(hr => hr.position === 'end').map(hr => renderHorizontalRack(hr))}

                {/* Tooltip */}
                {hovered && (
                  <div style={{ marginTop:10, padding:'8px 14px', borderRadius:8, background:S.white, border:`1px solid ${hovered.picks>0 ? heat(hovered.picks,maxPicks)?.border+'66' : S.divider}`, boxShadow:S.shadow, display:'flex', gap:14, alignItems:'center' }}>
                    <span style={{ fontSize:11, color:S.dark, fontWeight:700 }}>{hovered.rack} · Col.{hovered.col}</span>
                    {hovered.picks>0 ? <>
                      <span style={{ fontSize:12, color:heat(hovered.picks,maxPicks)?.border, fontWeight:700 }}>{hovered.picks} picks</span>
                      <span style={{ fontSize:9.5, color:S.dim }}>— {heat(hovered.picks,maxPicks)?.label}</span>
                      <span style={{ fontSize:9, color:S.dimmer, marginLeft:'auto' }}>{((hovered.picks/total)*100).toFixed(2)}% du total</span>
                    </> : <span style={{ fontSize:9.5, color:S.dimmer }}>aucun pick</span>}
                  </div>
                )}

                {/* Légende */}
                <div style={{ display:'flex', gap:10, marginTop:10, paddingTop:10, borderTop:`1px solid ${S.divider}`, flexWrap:'wrap', alignItems:'center' }}>
                  {[{c:'#DC2626',bg:'#FEE2E2',l:'>75%'},{c:'#EA580C',bg:'#FFEDD5',l:'50–75%'},{c:'#CA8A04',bg:'#FEF9C3',l:'25–50%'},{c:'#16A34A',bg:'#DCFCE7',l:'8–25%'},{c:'#2563EB',bg:'#DBEAFE',l:'<8%'}].map((l,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <div style={{ width:12, height:12, borderRadius:2, background:l.bg, border:`1.5px solid ${l.c}` }}/>
                      <span style={{ fontSize:8.5, color:S.dim }}>{l.l}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ═══════ Panel droit ═══════ */}
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {selRack ? (
                  <div style={{ background:S.white, border:`2px solid ${S.blue}33`, borderRadius:13, padding:16, boxShadow:S.shadow }}>
                    <div style={{ fontSize:9, color:S.blue, letterSpacing:'0.1em', fontWeight:600, marginBottom:8 }}>◉ RACK SÉLECTIONNÉ</div>
                    <div style={{ fontSize:24, fontWeight:800, color:S.dark, marginBottom:10 }}>{selRack}</div>
                    {(() => {
                      const rackNbCols = getColsForRack(selRack)
                      return (
                        <>
                          {[
                            {l:'Picks totaux', v:selTotal, c:S.blue},
                            {l:'% du total',   v:`${((selTotal/total)*100).toFixed(1)}%`, c:S.dim},
                            {l:'Cols actives', v:`${Object.keys(selCols).length}/${rackNbCols}`, c:S.dim},
                          ].map((r,i) => (
                            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${S.divider}` }}>
                              <span style={{ fontSize:9, color:S.dim }}>{r.l}</span>
                              <span style={{ fontSize:10.5, color:r.c, fontWeight:700 }}>{r.v}</span>
                            </div>
                          ))}
                          <div style={{ marginTop:12 }}>
                            <div style={{ fontSize:8, color:S.dimmer, marginBottom:6 }}>PROFIL (réception → fond)</div>
                            <div style={{ display:'flex', gap:1.5, alignItems:'flex-end', height:40 }}>
                              {Array.from({length: rackNbCols}, (_, ci) => {
                                const p=getPicks(selRack,ci+1); const h=heat(p,selMax||1)
                                return (
                                  <div key={ci} style={{ flex:1 }}>
                                    <div style={{ width:'100%', height:`${p>0?Math.max(p/selMax*34,3):2}px`, background:h?h.fill:'#F1F5F9', border:`1px solid ${h?h.border:S.divider}`, borderRadius:'2px 2px 0 0' }}/>
                                  </div>
                                )
                              })}
                            </div>
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:7, color:S.dimmer, marginTop:3 }}>
                              <span>réception</span><span>fond</span>
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                ) : (
                  <div style={{ background:S.bg, border:`1.5px dashed ${S.divider}`, borderRadius:13, padding:16, textAlign:'center', minHeight:100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ marginBottom:8, display:'flex', justifyContent:'center' }}><MousePointer2 size={36} strokeWidth={1.5} color={S.dim} /></div>
                    <div style={{ fontSize:10.5, color:S.dim }}>Cliquez sur un rack<br/>pour le détail</div>
                  </div>
                )}
                {/* Top 10 */}
                <div style={{ background:S.white, border:`1px solid ${S.divider}`, borderRadius:13, padding:14, boxShadow:S.shadow }}>
                  <div style={{ fontSize:10, fontWeight:700, color:S.dark, marginBottom:10, display:'flex', alignItems:'center', gap:6 }}><Flame size={14} color="#EA580C" /> Top 10 colonnes</div>
                  {[...data.cells].sort((a,b)=>b.picks-a.picks).slice(0,10).map((c,i) => {
                    const h = heat(c.picks, maxPicks)
                    return (
                      <div key={i} onClick={() => setSelRack(c.rack)}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 0', borderBottom:`1px solid ${S.divider}`, cursor:'pointer' }}>
                        <span style={{ fontSize:8, color:S.dimmer, width:14 }}>#{i+1}</span>
                        <span style={{ fontSize:10, color:S.dark, fontWeight:600, width:36 }}>{c.rack}</span>
                        <span style={{ fontSize:9, color:S.dim, width:22 }}>c.{c.column}</span>
                        <div style={{ flex:1, height:5, background:S.bg, borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${c.picks/maxPicks*100}%`, background:h?.border||S.blue, borderRadius:3 }}/>
                        </div>
                        <span style={{ fontSize:10, color:h?.border||S.blue, fontWeight:700, width:26, textAlign:'right' }}>{c.picks}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ PICKS ═══════ */}
          {tab==='picks' && (
            <div style={{ background:S.white, border:`1px solid ${S.divider}`, borderRadius:13, padding:20, boxShadow:S.shadow }}>
              <div style={{ fontSize:11, fontWeight:700, color:S.dark, marginBottom:16 }}>Picks par rack</div>
              <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:220, paddingBottom:28 }}>
                {Object.entries(rackTotals).sort((a,b)=>b[1]-a[1]).map(([rack,picks]) => {
                  const h = heat(picks, maxRack)
                  return (
                    <div key={rack} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, cursor:'pointer', flex:1 }}
                      onClick={() => setSelRack(p => p===rack?null:rack)}>
                      <div style={{ fontSize:7, color:h?.border||S.dim, fontWeight:700 }}>{picks}</div>
                      <div style={{ width:'80%', height:`${picks/maxRack*180}px`, minHeight:3,
                        background:h?.fill||'#F1F5F9', border:`1.5px solid ${h?.border||S.divider}`,
                        borderRadius:'4px 4px 0 0', transition:'opacity 0.15s',
                        opacity: selRack && selRack!==rack ? 0.5 : 1 }}/>
                      <div style={{ fontSize:7, color:selRack===rack?S.blue:S.dim, fontWeight:selRack===rack?700:400, textAlign:'center' }}>
                        {rack}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ═══════ CALENDRIER ═══════ */}
          {tab==='calendrier' && (
            <div style={{ background:S.white, border:`1px solid ${S.divider}`, borderRadius:13, padding:20, boxShadow:S.shadow }}>
              <div style={{ fontSize:11, fontWeight:700, color:S.dark, marginBottom:16 }}>Picks par jour</div>
              <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:180, paddingBottom:28 }}>
                {Object.entries(data.date_picks||{}).map(([date,picks]) => {
                  const maxD = Math.max(...Object.values(data.date_picks||{}),1)
                  const h = heat(picks, maxD)
                  return (
                    <div key={date} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                      <div style={{ fontSize:8, color:h?.border||S.dim, fontWeight:600 }}>{picks}</div>
                      <div style={{ width:'100%', height:`${picks/maxD*140}px`, minHeight:4,
                        background:h?.fill||'#F1F5F9', border:`1.5px solid ${h?.border||S.divider}`,
                        borderRadius:'4px 4px 0 0' }}/>
                      <div style={{ fontSize:7.5, color:S.dimmer, textAlign:'center', lineHeight:1.4 }}>{date.slice(8)}/{date.slice(5,7)}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:14 }}>
                {[
                  {l:'Jour le + chargé', v:`${Object.entries(data.date_picks||{}).sort((a,b)=>b[1]-a[1])[0]?.[0]?.slice(5)||'—'} — ${Math.max(...Object.values(data.date_picks||{}))} picks`, c:'#DC2626', bg:'#FEF2F2'},
                  {l:'Moyenne / jour',   v:`${Math.round(total/Math.max(Object.keys(data.date_picks||{}).length,1))} picks`, c:S.blue, bg:'#EFF6FF'},
                  {l:'Jour le + calme',  v:`${Object.entries(data.date_picks||{}).sort((a,b)=>a[1]-b[1])[0]?.[0]?.slice(5)||'—'} — ${Math.min(...Object.values(data.date_picks||{}))} picks`, c:'#16A34A', bg:'#F0FDF4'},
                ].map((s,i) => (
                  <div key={i} style={{ padding:'12px 14px', borderRadius:9, background:s.bg, border:`1px solid ${s.c}22` }}>
                    <div style={{ fontSize:13, fontWeight:700, color:s.c }}>{s.v}</div>
                    <div style={{ fontSize:9, color:S.dim, marginTop:3 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}