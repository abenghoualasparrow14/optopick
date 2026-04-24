import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { S } from '../components/styles'
import { Loading, ErrorBox, EmptyState } from '../components/Widgets'
import { MapPin, Boxes, UploadCloud, CheckCircle, AlertTriangle, Package, ShoppingCart, Loader2, Route, Target, TrendingDown, Move, X, Flag } from 'lucide-react'

export default function RoutingPage() {
  const [warehouses,  setWarehouses]  = useState([])
  const [selectedWh,  setSelectedWh]  = useState('')
  const [articles,    setArticles]    = useState([])   // catalogue articles
  const [search,      setSearch]      = useState('')   // recherche
  const [order,       setOrder]       = useState([])   // articles ajoutés à la commande
  const [result,      setResult]      = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [loadingArts, setLoadingArts] = useState(false)
  const [uploadingCat,setUploadingCat] = useState(false)
  const [catUploadMsg,setCatUploadMsg] = useState('')
  const [catStatus,   setCatStatus]   = useState(null)  // {articles_count, has_catalog}
  const [error,       setError]       = useState('')

  const handleUploadCatalog = async (e) => {
    const file = e.target.files[0]
    if (!file || !selectedWh) return
    setUploadingCat(true)
    setCatUploadMsg('')
    try {
      const res = await api.routing.uploadCatalog(parseInt(selectedWh), file)
      setCatUploadMsg(`Succès: ${res.articles_created} créés, ${res.articles_updated} mis à jour.`)
      // Rafraîchir le statut du catalogue
      api.routing.catalogStatus(parseInt(selectedWh)).then(setCatStatus).catch(() => {})
    } catch(err) {
      setCatUploadMsg(`Erreur: ${err.message}`)
    } finally {
      setUploadingCat(false)
      e.target.value = null
    }
  }

  useEffect(() => {
    api.warehouses.list().then(w => {
      setWarehouses(w)
      if (w.length === 1) setSelectedWh(String(w[0].id))
    })
  }, [])

  useEffect(() => {
    if (!selectedWh) return
    setLoadingArts(true)
    setOrder([])
    setResult(null)
    setCatUploadMsg('')
    api.routing.listArticles(parseInt(selectedWh))
      .then(d => setArticles(d.articles || []))
      .catch(e => setError(e.message))
      .finally(() => setLoadingArts(false))
    // Charger le statut du catalogue
    api.routing.catalogStatus(parseInt(selectedWh))
      .then(setCatStatus)
      .catch(() => setCatStatus(null))
  }, [selectedWh])

  // Filtrer les articles selon la recherche
  const filtered = articles.filter(a =>
    a.article_name.toLowerCase().includes(search.toLowerCase()) ||
    a.article_id.toLowerCase().includes(search.toLowerCase())
  )

  // Ajouter un article à la commande
  const addArticle = (article) => {
    const exists = order.find(o => o.article_id === article.article_id)
    if (exists) {
      // Incrémenter la quantité
      setOrder(order.map(o =>
        o.article_id === article.article_id
          ? { ...o, quantity: o.quantity + 1 }
          : o
      ))
    } else {
      setOrder([...order, { ...article, quantity: 1 }])
    }
  }

  // Retirer un article de la commande
  const removeArticle = (article_id) => {
    setOrder(order.filter(o => o.article_id !== article_id))
  }

  // Modifier la quantité
  const setQty = (article_id, qty) => {
    const q = parseInt(qty)
    if (q <= 0) return removeArticle(article_id)
    setOrder(order.map(o => o.article_id === article_id ? { ...o, quantity: q } : o))
  }

  // Lancer l'optimisation
  const optimize = async () => {
    if (!selectedWh || order.length === 0) return
    setLoading(true); setError(''); setResult(null)
    try {
      const articles_payload = order.map(o => ({
        article_id: o.article_id,
        quantity:   o.quantity,
      }))
      const res = await api.routing.optimize(parseInt(selectedWh), articles_payload)
      setResult(res)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const selectStyle = {
    width: '100%', padding: '10px 13px', borderRadius: 8, fontSize: 11,
    fontFamily: S.font, background: S.white, border: `1.5px solid ${S.divider}`,
    color: S.dark, outline: 'none', cursor: 'pointer',
  }

  return (
    <div>
      {/* Sélecteur entrepôt */}
      <div style={{ marginBottom: 20, maxWidth: 360 }}>
        <div style={{ fontSize: 9.5, color: S.dim, fontWeight: 600, marginBottom: 6 }}>ENTREPÔT</div>
        <select value={selectedWh} onChange={e => setSelectedWh(e.target.value)} style={selectStyle}>
          <option value=''>-- Choisir un entrepôt --</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {!selectedWh && <EmptyState icon={<MapPin size={48} strokeWidth={1.5} color={S.dimmer} />} text='Sélectionnez un entrepôt' sub='Les articles disponibles apparaîtront ici' />}

      {selectedWh && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

          {/* ── CATALOGUE ARTICLES ── */}
          <div style={{ background: S.white, border: `1px solid ${S.divider}`, borderRadius: 13, padding: 18, boxShadow: S.shadow }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: S.dark, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Boxes size={14} /> Catalogue articles
                <span style={{ fontSize: 9, color: S.dimmer, fontWeight: 400, marginLeft: 8 }}>
                  {articles.length} articles disponibles
                </span>
              </div>
              <label style={{ fontSize: 9, cursor: 'pointer', color: S.blue, background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                {uploadingCat ? <Loader2 size={12} className="spin" /> : <UploadCloud size={12} />} Importer Limites (Excel)
                <input type="file" style={{ display: 'none' }} accept=".csv, .xlsx, .xls" onChange={handleUploadCatalog} />
              </label>
            </div>

            {/* Indicateur statut catalogue */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 12px', borderRadius: 8, marginBottom: 12,
              background: catStatus?.has_catalog ? '#F0FDF4' : '#FFFBEB',
              border: `1px solid ${catStatus?.has_catalog ? '#BBF7D0' : '#FDE68A'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16 }}>
                {catStatus?.has_catalog ? <CheckCircle size={14} color="#16A34A" /> : <AlertTriangle size={14} color="#92400E" />}
              </div>
              <span style={{ fontSize: 9.5, color: catStatus?.has_catalog ? '#16A34A' : '#92400E', fontWeight: 600 }}>
                {catStatus?.has_catalog
                  ? `Référentiel chargé — ${catStatus.articles_count} article${catStatus.articles_count > 1 ? 's' : ''} avec limites de palette`
                  : 'Aucun référentiel importé — les limites par défaut (100) seront utilisées'
                }
              </span>
            </div>

            {catUploadMsg && <div style={{ fontSize: 9, marginBottom: 10, color: catUploadMsg.startsWith('Succès') ? '#16A34A' : '#DC2626' }}>{catUploadMsg}</div>}

            {/* Recherche */}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Rechercher un article...'
              style={{
                width: '100%', padding: '9px 13px', borderRadius: 8, fontSize: 11,
                background: S.bg, border: `1.5px solid ${S.divider}`,
                color: S.dark, fontFamily: S.font, outline: 'none', marginBottom: 12,
              }}
              onFocus={e  => e.target.style.borderColor = S.blue}
              onBlur={e   => e.target.style.borderColor = S.divider}
            />

            {loadingArts && <Loading text='Chargement des articles...' />}

            {/* Liste articles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 480, overflowY: 'auto' }}>
              {filtered.map(a => {
                const inOrder = order.find(o => o.article_id === a.article_id)
                return (
                  <div key={a.article_id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 9,
                      background: inOrder ? '#EFF6FF' : S.bg,
                      border: `1.5px solid ${inOrder ? S.blue : S.divider}`,
                      transition: 'all 0.15s', cursor: 'pointer',
                    }}
                    onClick={() => addArticle(a)}
                    onMouseEnter={e => !inOrder && (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={e => !inOrder && (e.currentTarget.style.background = S.bg)}
                  >
                    {/* Icône */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: inOrder ? '#DBEAFE' : S.white,
                      border: `1px solid ${inOrder ? '#93C5FD' : S.divider}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16,
                    }}>
                      {inOrder ? <CheckCircle size={16} color="#3B82F6" /> : <Package size={16} color={S.dim} />}
                    </div>

                    {/* Infos article */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: S.dark,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.article_name}
                      </div>
                      <div style={{ fontSize: 8.5, color: S.dimmer, marginTop: 2 }}>
                        {a.article_id} · {a.rack} col.{a.column} · {a.picks} picks
                      </div>
                    </div>

                    {/* Bouton ajouter */}
                    <div style={{
                      fontSize: 9, fontWeight: 700, flexShrink: 0,
                      color: inOrder ? S.blue : S.dim,
                      background: inOrder ? '#DBEAFE' : S.white,
                      border: `1px solid ${inOrder ? '#93C5FD' : S.divider}`,
                      padding: '4px 10px', borderRadius: 8,
                    }}>
                      {inOrder ? `x${inOrder.quantity}` : '+ Ajouter'}
                    </div>
                  </div>
                )
              })}

              {filtered.length === 0 && !loadingArts && (
                <div style={{ textAlign: 'center', padding: '30px', color: S.dimmer, fontSize: 11 }}>
                  Aucun article trouvé pour "{search}"
                </div>
              )}
            </div>
          </div>

          {/* ── COMMANDE + RÉSULTAT ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Commande en cours */}
            <div style={{ background: S.white, border: `1px solid ${S.divider}`, borderRadius: 13, padding: 16, boxShadow: S.shadow }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: S.dark, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShoppingCart size={14} /> Ma commande
                  <span style={{ fontSize: 9, color: S.dimmer, fontWeight: 400, marginLeft: 8 }}>
                    {order.length} article{order.length > 1 ? 's' : ''}
                  </span>
                </div>
                {order.length > 0 && (
                  <button onClick={() => setOrder([])} style={{
                    fontSize: 9, color: S.red, background: '#FEF2F2',
                    border: '1px solid #FECACA', borderRadius: 6,
                    padding: '3px 9px', cursor: 'pointer', fontFamily: S.font,
                  }}>
                    Vider
                  </button>
                )}
              </div>

              {order.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: S.dimmer, fontSize: 10 }}>
                  Cliquez sur un article pour l'ajouter
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, maxHeight: 260, overflowY: 'auto' }}>
                  {order.map(o => (
                    <div key={o.article_id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 8,
                      background: '#EFF6FF', border: '1px solid #BFDBFE',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: S.dark,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {o.article_name}
                        </div>
                        <div style={{ fontSize: 8, color: S.dimmer }}>{o.rack} · col.{o.column}</div>
                      </div>
                      {/* Quantité */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button onClick={() => setQty(o.article_id, o.quantity - 1)} style={{
                          width: 22, height: 22, borderRadius: 5, border: `1px solid ${S.divider}`,
                          background: S.white, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: S.dim,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>−</button>
                        <input
                          type='number' value={o.quantity} min={1}
                          onChange={e => setQty(o.article_id, e.target.value)}
                          style={{
                            width: 36, textAlign: 'center', padding: '2px 0',
                            borderRadius: 5, border: `1px solid ${S.divider}`,
                            fontSize: 11, fontWeight: 700, color: S.blue,
                            fontFamily: S.font, outline: 'none',
                          }}
                        />
                        <button onClick={() => setQty(o.article_id, o.quantity + 1)} style={{
                          width: 22, height: 22, borderRadius: 5, border: `1px solid ${S.divider}`,
                          background: S.white, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: S.dim,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>+</button>
                      </div>
                      {/* Supprimer */}
                      <button onClick={() => removeArticle(o.article_id)} style={{
                        width: 22, height: 22, borderRadius: 5, border: 'none',
                        background: '#FEE2E2', cursor: 'pointer', fontSize: 11, color: S.red,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={optimize} disabled={order.length === 0 || loading} style={{
                width: '100%', padding: '11px', borderRadius: 9, border: 'none',
                background: (order.length === 0 || loading) ? '#BFDBFE' : 'linear-gradient(135deg,#1E40AF,#3B82F6)',
                color: (order.length === 0 || loading) ? '#93C5FD' : S.white,
                fontSize: 11, fontWeight: 700,
                cursor: (order.length === 0 || loading) ? 'not-allowed' : 'pointer',
                fontFamily: S.font, transition: 'all 0.2s',
                boxShadow: (order.length === 0 || loading) ? 'none' : '0 2px 10px rgba(30,64,175,0.3)',
              }}>
                {loading ? <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:6}}><Loader2 size={12} className="spin" /> Calcul en cours...</div> : <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:6}}><Route size={14} /> Calculer le trajet optimal</div>}
              </button>
            </div>

            {error && <ErrorBox message={error} />}

            {/* Résultat */}
            {result && (
              <>
                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { icon: <Move size={18} color="#16A34A" />, l: 'Distance optimisée', v: `${result.total_distance_m} m`, c: '#16A34A', bg: '#F0FDF4' },
                    { icon: <MapPin size={18} color="#1E40AF" />, l: 'Emplacements visités', v: result.tours?.reduce((acc, t) => acc + t.path.length, 0) || 0, c: '#1E40AF', bg: '#EFF6FF' },
                  ].map((k, i) => (
                    <div key={i} style={{ padding: '12px', borderRadius: 9, background: k.bg, border: `1px solid ${k.c}22` }}>
                      <div style={{ fontSize: 14, marginBottom: 4 }}>{k.icon}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: k.c }}>{k.v}</div>
                      <div style={{ fontSize: 8.5, color: S.dim, marginTop: 2 }}>{k.l}</div>
                    </div>
                  ))}
                </div>

                {/* Trajet Segmenté (Tours) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  {(result.tours || []).map(tour => (
                    <div key={tour.tour_index} style={{ background: S.white, border: `1px solid ${S.divider}`, borderRadius: 13, padding: 14, boxShadow: S.shadow }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: S.dark }}>
                          Tournée {tour.tour_index}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: tour.fill_pct >= 95 ? S.red : S.blue, background: tour.fill_pct >= 95 ? '#FEE2E2' : '#EFF6FF', padding: '4px 8px', borderRadius: 6 }}>
                          Remplissage : {tour.fill_pct}%
                        </div>
                      </div>
                      
                      <div style={{ fontSize: 10, color: S.dim, marginBottom: 10 }}>Distance totale : {tour.distance_m} m</div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {/* Départ */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Flag size={14} color="#16A34A" /></div>
                          <div style={{ fontSize: 10, color: '#16A34A', fontWeight: 700 }}>DÉPART — Zone Réception</div>
                        </div>

                        {(tour.path || []).map((loc, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', borderRadius: 8,
                            background: S.bg, border: `1px solid ${S.divider}`,
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: 7, background: '#EFF6FF',
                              border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 11, fontWeight: 800, color: S.blue, flexShrink: 0,
                            }}>{i + 1}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 10, color: S.dark, fontWeight: 600,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {loc.article_id}
                              </div>
                              <div style={{ fontSize: 8.5, color: S.dim }}>{loc.rack} · Colonne {loc.column} · Qté : {loc.quantity}</div>
                            </div>
                            <div style={{ fontSize: 9, fontWeight: 700, color: S.blue, background: '#EFF6FF', padding: '3px 9px', borderRadius: 7, flexShrink: 0 }}>
                              {loc.rack}
                            </div>
                          </div>
                        ))}

                        {/* Retour */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Flag size={14} color="#16A34A" /></div>
                          <div style={{ fontSize: 10, color: '#16A34A', fontWeight: 700 }}>RETOUR — Zone Réception</div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {result.not_found?.length > 0 && (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <div style={{ fontSize: 9, color: '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={12} /> Articles non trouvés en base : {result.not_found.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}