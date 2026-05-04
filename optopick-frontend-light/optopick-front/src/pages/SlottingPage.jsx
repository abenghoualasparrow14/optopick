import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { S, abcColor, abcBg } from '../components/styles'
import { Loading, ErrorBox, EmptyState } from '../components/Widgets'
import { Boxes, Circle, Repeat, ClipboardList, MousePointer2, Info, ArrowDownUp, TrendingUp } from 'lucide-react'

export default function SlottingPage() {
  const [warehouses, setWarehouses] = useState([])
  const [selectedWh, setSelectedWh] = useState('')
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [view,       setView]       = useState('articles')
  const [filter,     setFilter]     = useState('ALL')
  const [selArt,     setSelArt]     = useState(null)
  const [sort,       setSort]       = useState('picks')

  useEffect(() => {
    api.warehouses.list().then(w => { setWarehouses(w); if (w.length===1) setSelectedWh(String(w[0].id)) })
  }, [])

  useEffect(() => {
    if (!selectedWh) return
    setLoading(true); setError(''); setData(null); setSelArt(null)
    api.slotting.get(parseInt(selectedWh))
      .then(setData).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [selectedWh])

  const zoneCible  = abc => abc==='A'?[1,4]:abc==='B'?[5,10]:[11,18]
  const statutPlace = a => {
    const [lo,hi] = zoneCible(a.abc_class)
    if (a.col_avg < lo) return { label:'TROP EN AVANT',   color:'#EA580C', bg:'#FFF7ED', border:'#FDBA74' }
    if (a.col_avg > hi) return { label:'TROP EN ARRIÈRE', color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' }
    return                     { label:'BIEN PLACÉ',      color:'#16A34A', bg:'#F0FDF4', border:'#BBF7D0' }
  }

  const articles = data?.articles || []
  const total    = articles.reduce((s,a) => s+a.picks, 0)
  const filtered = articles
    .filter(a => filter==='ALL' || a.abc_class===filter)
    .sort((a,b) => sort==='picks'?b.picks-a.picks:sort==='col_avg'?b.col_avg-a.col_avg:a.abc_class.localeCompare(b.abc_class))
  const sel = selArt ? articles.find(a=>a.article_id===selArt) : null
  const selExchange = sel ? (data?.exchanges||[]).find(e=>e.article_a?.article_id===sel.article_id||e.article_b?.article_id===sel.article_id) : null

  const tabStyle = k => ({
    padding:'7px 18px', borderRadius:8, border:`1px solid ${view===k?S.blue:S.divider}`,
    fontSize:10.5, cursor:'pointer', fontFamily:S.font,
    background: view===k ? '#EFF6FF' : S.white,
    color: view===k ? S.blue : S.dim, fontWeight: view===k ? 700 : 400,
  })

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <select value={selectedWh} onChange={e => { setSelectedWh(e.target.value); setSelArt(null) }}
          style={{ padding:'9px 13px', borderRadius:8, fontSize:11, fontFamily:S.font,
            background:S.white, border:`1.5px solid ${S.divider}`, color:S.dark, outline:'none', cursor:'pointer' }}>
          <option value=''>-- Choisir un entrepôt --</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {loading && <Loading text='Calcul de la classification ABC...' />}
      {error && error.toLowerCase().includes('aucune donn')
        ? <EmptyState icon={<Boxes size={48} color={S.dimmer} strokeWidth={1.5} />} text='Aucune donnée importée pour cet entrepôt' sub="Importez vos données via le module Import pour commencer l'analyse." />
        : error && <ErrorBox message={error} />}
      {!loading && !data && !error && <EmptyState icon={<Boxes size={48} color={S.dimmer} strokeWidth={1.5} />} text='Sélectionnez un entrepôt' />}

      {data && (
        <>
          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:18 }}>
            {[
              { icon:<Boxes size={18} color="#1E40AF" />, l:'Articles',   v:articles.length,  c:'#1E40AF', bg:'#EFF6FF' },
              { icon:<Circle fill="#DC2626" size={18} color="#DC2626" />, l:'Classe A',   v:`${articles.filter(a=>a.abc_class==='A').length} art.`, c:'#DC2626', bg:'#FEF2F2' },
              { icon:<Circle fill="#EA580C" size={18} color="#EA580C" />, l:'Classe B',   v:`${articles.filter(a=>a.abc_class==='B').length} art.`, c:'#EA580C', bg:'#FFF7ED' },
              { icon:<Circle fill="#2563EB" size={18} color="#2563EB" />, l:'Classe C',   v:`${articles.filter(a=>a.abc_class==='C').length} art.`, c:'#2563EB', bg:'#EFF6FF' },
              { icon:<Repeat size={18} color="#16A34A" />, l:'Échanges',   v:`${data.exchanges?.length||0} recommandés`,             c:'#16A34A', bg:'#F0FDF4' },
            ].map((k,i) => (
              <div key={i} style={{ padding:'12px 14px', borderRadius:10, background:k.bg, border:`1px solid ${k.c}22`, boxShadow:S.shadow }}>
                <div style={{ fontSize:16, marginBottom:4 }}>{k.icon}</div>
                <div style={{ fontSize:14, fontWeight:700, color:k.c }}>{k.v}</div>
                <div style={{ fontSize:8.5, color:S.dim, marginTop:2 }}>{k.l}</div>
              </div>
            ))}
          </div>

          {/* Onglets */}
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            <button onClick={() => setView('articles')} style={{...tabStyle('articles'), display:'flex', alignItems:'center', gap:6}}><ClipboardList size={14} /> Tous les articles</button>
            <button onClick={() => setView('echanges')} style={{...tabStyle('echanges'), display:'flex', alignItems:'center', gap:6}}><Repeat size={14} /> Plan de reslotting</button>
          </div>

          {/* VUE ARTICLES */}
          {view==='articles' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>
              <div style={{ background:S.white, border:`1px solid ${S.divider}`, borderRadius:13, padding:16, boxShadow:S.shadow }}>
                {/* Filtres */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
                  <div style={{ display:'flex', gap:6 }}>
                    {['ALL','A','B','C'].map(f => (
                      <button key={f} onClick={() => setFilter(f)} style={{
                        padding:'5px 13px', borderRadius:7, border:`1px solid ${filter===f?(abcColor[f]||S.blue):S.divider}`,
                        background: filter===f ? (abcBg[f]||'#EFF6FF') : S.white,
                        color: filter===f ? (abcColor[f]||S.blue) : S.dim,
                        fontSize:10, cursor:'pointer', fontFamily:S.font, fontWeight: filter===f?700:400,
                      }}>
                        {f==='ALL'?'Tous':`Classe ${f}`}
                      </button>
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <span style={{ fontSize:9, color:S.dim }}>Trier :</span>
                    {[{v:'picks',l:'Picks'},{v:'col_avg',l:'Col.moy.'},{v:'abc',l:'ABC'}].map(s => (
                      <button key={s.v} onClick={() => setSort(s.v)} style={{
                        padding:'4px 10px', borderRadius:6, border:`1px solid ${sort===s.v?S.blue:S.divider}`,
                        background: sort===s.v?'#EFF6FF':S.white,
                        color: sort===s.v?S.blue:S.dim, fontSize:9, cursor:'pointer', fontFamily:S.font,
                      }}>{s.l}</button>
                    ))}
                  </div>
                </div>
                {/* Légende zones */}
                <div style={{ display:'flex', gap:10, alignItems:'center', padding:'7px 12px', borderRadius:8, background:S.bg, border:`1px solid ${S.divider}`, marginBottom:12 }}>
                  <span style={{ fontSize:8.5, color:S.dim }}>Zones cibles :</span>
                  {[{abc:'A',label:'col.1–4'},{abc:'B',label:'col.5–10'},{abc:'C',label:'col.11–18'}].map(z => (
                    <span key={z.abc} style={{ fontSize:9, color:abcColor[z.abc], fontWeight:700, background:abcBg[z.abc], padding:'2px 8px', borderRadius:10 }}>
                      {z.abc} → {z.label}
                    </span>
                  ))}
                </div>
                {/* En-tête */}
                <div style={{ display:'grid', gridTemplateColumns:'36px 1fr 55px 70px 100px 140px', gap:6, padding:'0 8px 8px', borderBottom:`1px solid ${S.divider}` }}>
                  {['ABC','Article','Picks','Col.moy.','Zone cible','Statut'].map((h,i) => (
                    <div key={i} style={{ fontSize:8.5, color:S.dim, fontWeight:600, letterSpacing:'0.05em' }}>{h}</div>
                  ))}
                </div>
                {/* Lignes */}
                <div style={{ display:'flex', flexDirection:'column', gap:3, overflowY:'auto', maxHeight:480, marginTop:6 }}>
                  {filtered.map(a => {
                    const isSel = selArt===a.article_id
                    const st    = statutPlace(a)
                    const [lo,hi] = zoneCible(a.abc_class)
                    return (
                      <div key={a.article_id} onClick={() => setSelArt(isSel?null:a.article_id)}
                        style={{ display:'grid', gridTemplateColumns:'36px 1fr 55px 70px 100px 140px', gap:6,
                          padding:'8px', borderRadius:9, cursor:'pointer',
                          background: isSel ? '#EFF6FF' : S.white,
                          border:`1.5px solid ${isSel?S.blue:S.divider}`,
                          transition:'all 0.12s', boxShadow: isSel ? S.shadow : 'none',
                        }}
                        onMouseEnter={e => !isSel && (e.currentTarget.style.background=S.bg)}
                        onMouseLeave={e => !isSel && (e.currentTarget.style.background=S.white)}>
                        <div style={{ display:'flex', alignItems:'center' }}>
                          <div style={{ width:26, height:26, borderRadius:7, background:abcBg[a.abc_class], border:`1.5px solid ${abcColor[a.abc_class]}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:abcColor[a.abc_class] }}>{a.abc_class}</div>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', justifyContent:'center' }}>
                          <div style={{ fontSize:10.5, color:S.dark, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.article_name||a.article_id}</div>
                          <div style={{ fontSize:8, color:S.dimmer }}>{a.article_id} · {a.top_rack}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center' }}><span style={{ fontSize:11, color:S.blue, fontWeight:700 }}>{a.picks}</span></div>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <span style={{ fontSize:10.5, fontWeight:700, color:a.col_avg<=4?'#16A34A':a.col_avg<=10?'#CA8A04':'#DC2626' }}>{a.col_avg}</span>
                          <div style={{ flex:1, height:4, background:S.divider, borderRadius:2, overflow:'hidden', position:'relative' }}>
                            <div style={{ position:'absolute', left:`${(lo-1)/18*100}%`, width:`${(hi-lo+1)/18*100}%`, height:'100%', background:'#BBF7D0', borderRadius:2 }}/>
                            <div style={{ position:'absolute', left:`${Math.min((a.col_avg-1)/18*100,94)}%`, width:3, height:'100%', background:st.color, borderRadius:2 }}/>
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center' }}><span style={{ fontSize:9.5, color:abcColor[a.abc_class], fontWeight:700 }}>col.{lo}–{hi}</span></div>
                        <div style={{ display:'flex', alignItems:'center' }}><span style={{ fontSize:8.5, fontWeight:600, color:st.color, padding:'3px 8px', borderRadius:12, background:st.bg, border:`1px solid ${st.border}` }}>{st.label}</span></div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Panel détail */}
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {sel ? (
                  <div style={{ background:S.white, border:`2px solid ${S.blue}33`, borderRadius:13, padding:18, boxShadow:S.shadow }}>
                    <div style={{ fontSize:9, color:S.blue, fontWeight:700, letterSpacing:'0.08em', marginBottom:10 }}>◉ ARTICLE SÉLECTIONNÉ</div>
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:abcBg[sel.abc_class], border:`2px solid ${abcColor[sel.abc_class]}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:abcColor[sel.abc_class] }}>{sel.abc_class}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:S.dark }}>{sel.article_name||sel.article_id}</div>
                        <div style={{ fontSize:9, color:S.dim }}>{sel.article_id}</div>
                      </div>
                    </div>
                    {[
                      {l:'Picks',         v:`${sel.picks} (${sel.pct}%)`,     c:S.blue},
                      {l:'Col. actuelle', v:sel.col_avg,                       c:statutPlace(sel).color},
                      {l:'Zone cible',    v:`col.${zoneCible(sel.abc_class)[0]}–${zoneCible(sel.abc_class)[1]}`, c:abcColor[sel.abc_class]},
                      {l:'Statut',        v:statutPlace(sel).label,            c:statutPlace(sel).color},
                      {l:'En col. 1–4',   v:`${sel.pct_hot}%`,                 c:'#16A34A'},
                      {l:'Rack principal',v:sel.top_rack,                      c:'#7C3AED'},
                    ].map((r,i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${S.divider}` }}>
                        <span style={{ fontSize:9.5, color:S.dim }}>{r.l}</span>
                        <span style={{ fontSize:10.5, color:r.c, fontWeight:700 }}>{r.v}</span>
                      </div>
                    ))}
                    {selExchange && (
                      <div style={{ marginTop:14, padding:'12px', borderRadius:10, background:'#EFF6FF', border:'1px solid #BFDBFE' }}>
                        <div style={{ fontSize:9, color:S.blue, fontWeight:700, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}><Repeat size={12} /> ÉCHANGE #{selExchange.exchange_id}</div>
                        {[selExchange.article_a, selExchange.article_b].map((art,i) => (
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:i===0?`1px dashed ${S.divider}`:'none' }}>
                            <div style={{ width:22, height:22, borderRadius:5, background:abcBg[art.abc_class], display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:abcColor[art.abc_class] }}>{art.abc_class}</div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:9.5, color:art.article_id===sel.article_id?S.dark:'#64748B', fontWeight:art.article_id===sel.article_id?700:400 }}>{art.article_name||art.article_id}</div>
                              <div style={{ fontSize:8, color:S.dimmer }}>col.moy. {art.col_avg} → col.{i===0?'1–4':`${zoneCible(art.abc_class)[0]}–${zoneCible(art.abc_class)[1]}`}</div>
                            </div>
                          </div>
                        ))}
                        <div style={{ marginTop:8, fontSize:10, color:'#16A34A', fontWeight:700 }}>Gain estimé : ~{selExchange.gain_meters} m/mois</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ background:S.bg, border:`1.5px dashed ${S.divider}`, borderRadius:13, padding:16, textAlign:'center', minHeight:100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ marginBottom:8, display:'flex', justifyContent:'center' }}><MousePointer2 size={36} color={S.dim} strokeWidth={1.5} /></div>
                    <div style={{ fontSize:10.5, color:S.dim }}>Cliquez sur un article<br/>pour le détail</div>
                  </div>
                )}
                {/* Résumé ABC */}
                <div style={{ background:S.white, border:`1px solid ${S.divider}`, borderRadius:13, padding:16, boxShadow:S.shadow }}>
                  <div style={{ fontSize:11, fontWeight:700, color:S.dark, marginBottom:12 }}>Répartition ABC</div>
                  {['A','B','C'].map(cls => {
                    const clsPicks = articles.filter(a=>a.abc_class===cls).reduce((s,a)=>s+a.picks,0)
                    const pct = Math.round(clsPicks/total*100)
                    return (
                      <div key={cls} style={{ marginBottom:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontSize:10, color:abcColor[cls], fontWeight:700, background:abcBg[cls], padding:'2px 8px', borderRadius:10 }}>Classe {cls}</span>
                          <span style={{ fontSize:10, color:S.dim, fontWeight:600 }}>{pct}%</span>
                        </div>
                        <div style={{ height:8, background:S.bg, borderRadius:4, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:abcColor[cls], borderRadius:4, opacity:0.7 }}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VUE ÉCHANGES */}
          {view==='echanges' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ padding:'12px 16px', borderRadius:10, background:'#EFF6FF', border:'1px solid #BFDBFE' }}>
                  <div style={{ fontSize:10, color:S.blue, fontWeight:700, marginBottom:5, display:'flex', alignItems:'center', gap:6 }}><Info size={12} /> Logique de reslotting</div>
                  <div style={{ fontSize:10, color:S.dim, lineHeight:1.8 }}>
                    Chaque échange déplace un <strong style={{color:'#DC2626'}}>article A trop loin</strong> vers col.1–4 en le substituant par un <strong style={{color:'#2563EB'}}>article B/C trop près</strong>. Les deux atteignent leur zone optimale simultanément.
                  </div>
                </div>
                <div style={{ fontSize:10, color:S.dim, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}><Repeat size={12} /> {data.exchanges?.length||0} échanges · gain total ~{data.total_gain_meters} m/mois</div>
                {(data.exchanges||[]).map(e => (
                  <div key={e.exchange_id} style={{ background:S.white, border:`1px solid ${S.divider}`, borderRadius:12, padding:'14px 16px', boxShadow:S.shadow }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:28, height:28, borderRadius:7, background:'#EFF6FF', border:'1px solid #BFDBFE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:S.blue }}>#{e.exchange_id}</div>
                        <span style={{ fontSize:10, color:S.dim }}>Échange recommandé</span>
                      </div>
                      <span style={{ fontSize:11, color:'#16A34A', fontWeight:700, background:'#F0FDF4', padding:'3px 10px', borderRadius:10 }}>~{e.gain_meters} m/mois</span>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 28px 1fr', gap:8, alignItems:'center' }}>
                      {[e.article_a, e.article_b].map((art,i) => (
                        <div key={i} style={{ padding:'10px 12px', borderRadius:9, background:abcBg[art?.abc_class], border:`1.5px solid ${abcColor[art?.abc_class]}33` }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                            <span style={{ fontSize:10, fontWeight:700, color:abcColor[art?.abc_class], background:S.white, padding:'2px 7px', borderRadius:8 }}>{art?.abc_class}</span>
                            <span style={{ fontSize:9.5, color:S.dark, fontWeight:600 }}>{art?.article_name||art?.article_id}</span>
                          </div>
                          <div style={{ fontSize:8.5, color:S.dim }}>Col. actuelle : <strong style={{color:'#DC2626'}}>{art?.col_avg}</strong></div>
                          <div style={{ fontSize:9, color:'#16A34A', fontWeight:600, marginTop:3 }}>
                            → col.{i===0?'1–4':`${zoneCible(art?.abc_class||'C')[0]}–${zoneCible(art?.abc_class||'C')[1]}`}
                          </div>
                        </div>
                      ))}
                      <div style={{ textAlign:'center', color:S.blue }}><ArrowDownUp size={24} /></div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Impact */}
              <div style={{ background:S.white, border:`1px solid ${S.divider}`, borderRadius:13, padding:18, boxShadow:S.shadow, height:'fit-content' }}>
                <div style={{ fontSize:11, fontWeight:700, color:S.dark, marginBottom:14, display:'flex', alignItems:'center', gap:6 }}><TrendingUp size={14} /> Impact estimé</div>
                {[
                  {l:'Échanges directs',     v:data.exchanges?.length||0,          c:S.blue,    bg:'#EFF6FF'},
                  {l:'Articles relocalisés', v:(data.exchanges?.length||0)*2,       c:'#7C3AED', bg:'#F5F3FF'},
                  {l:'Gain total / mois',    v:`~${data.total_gain_meters} m`,       c:'#16A34A', bg:'#F0FDF4'},
                  {l:'Déplacements simples', v:data.simple_moves?.length||0,         c:'#CA8A04', bg:'#FEFCE8'},
                ].map((r,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${S.divider}` }}>
                    <span style={{ fontSize:9.5, color:S.dim }}>{r.l}</span>
                    <span style={{ fontSize:11, color:r.c, fontWeight:700, background:r.bg, padding:'2px 10px', borderRadius:10 }}>{r.v}</span>
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