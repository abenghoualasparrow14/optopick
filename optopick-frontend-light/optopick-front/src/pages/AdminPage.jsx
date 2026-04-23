import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { S } from '../components/styles'
import { Loading, ErrorBox } from '../components/Widgets'
import { Settings, FileText, UserPlus, Mail, Phone, Globe, CheckCircle, XCircle, Building, Key, Boxes, AlertTriangle, Loader2, Rocket } from 'lucide-react'

const BASE = '/api'
const tok  = () => localStorage.getItem('op_token')

async function adminReq(method, path, body=null) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${tok()}` },
    body: body ? JSON.stringify(body) : null,
  })
  if (!res.ok) {
    const err = await res.json().catch(()=>({detail:'Erreur'}))
    throw new Error(err.detail)
  }
  return res.json()
}

const STATUS_CONFIG = {
  pending:   { label:'En attente',  color:'#CA8A04', bg:'#FEFCE8', border:'#FDE68A' },
  contacted: { label:'Contacté',    color:'#2563EB', bg:'#EFF6FF', border:'#BFDBFE' },
  approved:  { label:'Approuvé',    color:'#16A34A', bg:'#F0FDF4', border:'#BBF7D0' },
  rejected:  { label:'Refusé',      color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
}

export default function AdminPage() {
  const [tab, setTab] = useState('requests')   // 'requests' | 'create'

  const tabBtn = (k, label, icon) => ({
    padding:'9px 20px', borderRadius:8, border:`1.5px solid ${tab===k ? S.blue : S.divider}`,
    background: tab===k ? '#EFF6FF' : S.white,
    color: tab===k ? S.blue : S.dim, fontSize:11, fontWeight: tab===k ? 700 : 500,
    cursor:'pointer', fontFamily:S.font, transition:'all 0.15s',
  })

  return (
    <div>
      {/* Bandeau admin */}
      <div style={{ padding:'12px 18px', borderRadius:10, marginBottom:20,
        background:'linear-gradient(135deg,#1E40AF,#3B82F6)',
        color:'#fff', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Settings size={24} color="#fff" /></div>
        <div>
          <div style={{ fontSize:13, fontWeight:700 }}>Dashboard Admin</div>
          <div style={{ fontSize:9.5, opacity:0.8 }}>Gestion des demandes d'accès et création de comptes</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        <button onClick={()=>setTab('requests')} style={{...tabBtn('requests'), display:'flex', alignItems:'center', gap:6}}><FileText size={14} /> Demandes d'accès</button>
        <button onClick={()=>setTab('create')}   style={{...tabBtn('create'), display:'flex', alignItems:'center', gap:6}}><UserPlus size={14} /> Créer un compte client</button>
      </div>

      {tab === 'requests' && <RequestsPanel />}
      {tab === 'create'   && <CreateAccountPanel />}
    </div>
  )
}


/* ═══════════════════════════════════════════════════ */
/*  REQUESTS PANEL (existing logic)                   */
/* ═══════════════════════════════════════════════════ */
function RequestsPanel() {
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [selected, setSelected] = useState(null)
  const [notes,    setNotes]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [filter,   setFilter]   = useState('all')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await adminReq('GET', '/requests/admin/all')
      setRequests(data)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const update = async (id, status, adminNotes) => {
    setSaving(true)
    try {
      await adminReq('PATCH', `/requests/admin/${id}`, { status, admin_notes: adminNotes })
      await load()
      setSelected(null)
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const filtered = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter)

  const counts = {
    all:       requests.length,
    pending:   requests.filter(r => r.status==='pending').length,
    contacted: requests.filter(r => r.status==='contacted').length,
    approved:  requests.filter(r => r.status==='approved').length,
    rejected:  requests.filter(r => r.status==='rejected').length,
  }

  return (
    <>
      {/* Filtres par statut */}
      <div style={{ display:'flex', gap:8, marginBottom:18, flexWrap:'wrap' }}>
        {[
          { k:'all',       label:`Toutes (${counts.all})`,              color:S.blue,    bg:'#EFF6FF'  },
          { k:'pending',   label:`En attente (${counts.pending})`,      color:'#CA8A04', bg:'#FEFCE8'  },
          { k:'contacted', label:`Contactés (${counts.contacted})`,     color:'#2563EB', bg:'#EFF6FF'  },
          { k:'approved',  label:`Approuvés (${counts.approved})`,      color:'#16A34A', bg:'#F0FDF4'  },
          { k:'rejected',  label:`Refusés (${counts.rejected})`,        color:'#DC2626', bg:'#FEF2F2'  },
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{
            padding:'6px 14px', borderRadius:20, border:`1.5px solid ${filter===f.k?f.color:S.divider}`,
            background: filter===f.k ? f.bg : S.white,
            color: filter===f.k ? f.color : S.dim,
            fontSize:10, fontWeight: filter===f.k?700:400,
            cursor:'pointer', fontFamily:S.font, transition:'all 0.15s',
          }}>{f.label}</button>
        ))}
      </div>

      {loading && <Loading text='Chargement des demandes...' />}
      {error   && <ErrorBox message={error} />}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px', color:S.dimmer, fontSize:12 }}>
          Aucune demande {filter !== 'all' ? `avec le statut "${filter}"` : ''}.
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map(req => {
          const st = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending
          const isOpen = selected?.id === req.id
          return (
            <div key={req.id} style={{
              background: S.white, border:`1.5px solid ${isOpen ? S.blue : S.divider}`,
              borderRadius:12, overflow:'hidden', boxShadow: isOpen ? S.shadowMd : S.shadow,
              transition:'all 0.2s',
            }}>
              {/* En-tête de la demande */}
              <div
                onClick={() => { setSelected(isOpen ? null : req); setNotes(req.admin_notes||'') }}
                style={{ display:'flex', alignItems:'center', gap:14,
                  padding:'14px 18px', cursor:'pointer' }}
              >
                {/* Avatar entreprise */}
                <div style={{ width:42, height:42, borderRadius:10, flexShrink:0,
                  background:'linear-gradient(135deg,#1E40AF,#3B82F6)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:18, color:'#fff', fontWeight:700 }}>
                  {req.company_name?.[0]?.toUpperCase() || '?'}
                </div>

                {/* Infos principales */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:3 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:S.dark }}>
                      {req.company_name}
                    </div>
                    <span style={{ fontSize:9, fontWeight:600, color:st.color,
                      background:st.bg, border:`1px solid ${st.border}`,
                      padding:'2px 9px', borderRadius:12 }}>
                      {st.label}
                    </span>
                  </div>
                  <div style={{ fontSize:10, color:S.dim, display:'flex', alignItems:'center', flexWrap:'wrap' }}>
                    <Mail size={10} style={{marginRight:4}} /> {req.email}
                    &nbsp;&nbsp;·&nbsp;&nbsp;
                    <Phone size={10} style={{marginRight:4}} /> {req.phone}
                    {req.website && <>&nbsp;&nbsp;·&nbsp;&nbsp;<Globe size={10} style={{marginRight:4}} /> {req.website}</>}
                  </div>
                </div>

                {/* Date + flèche */}
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:9, color:S.dimmer }}>
                    {new Date(req.created_at).toLocaleDateString('fr-FR', {
                      day:'2-digit', month:'short', year:'numeric'
                    })}
                  </div>
                  <div style={{ fontSize:12, color:S.dimmer, marginTop:4 }}>
                    {isOpen ? '▲' : '▼'}
                  </div>
                </div>
              </div>

              {/* Détail expandé */}
              {isOpen && (
                <div style={{ padding:'0 18px 18px', borderTop:`1px solid ${S.divider}` }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:14 }}>

                    {/* Infos contact */}
                    <div>
                      <div style={{ fontSize:9.5, fontWeight:700, color:S.dim,
                        letterSpacing:'0.08em', marginBottom:10 }}>INFORMATIONS</div>
                      {[
                        { l:'Entreprise',    v:req.company_name },
                        { l:'Email',         v:req.email },
                        { l:'Tél. contact',  v:req.phone },
                        { l:'Tél. entreprise',v:req.company_phone || '—' },
                        { l:'Site web',      v:req.website || '—' },
                      ].map((r,i) => (
                        <div key={i} style={{ display:'flex', gap:10, padding:'5px 0',
                          borderBottom:`1px solid ${S.divider}` }}>
                          <span style={{ fontSize:9.5, color:S.dimmer, width:110, flexShrink:0 }}>{r.l}</span>
                          <span style={{ fontSize:10, color:S.dark, fontWeight:500 }}>{r.v}</span>
                        </div>
                      ))}
                      {req.message && (
                        <div style={{ marginTop:12, padding:'10px 12px', borderRadius:8,
                          background:S.bg, border:`1px solid ${S.divider}` }}>
                          <div style={{ fontSize:9, color:S.dimmer, marginBottom:4 }}>MESSAGE</div>
                          <div style={{ fontSize:10, color:S.dark, lineHeight:1.7 }}>{req.message}</div>
                        </div>
                      )}
                    </div>

                    {/* Actions admin */}
                    <div>
                      <div style={{ fontSize:9.5, fontWeight:700, color:S.dim,
                        letterSpacing:'0.08em', marginBottom:10 }}>ACTIONS ADMIN</div>

                      {/* Notes */}
                      <div style={{ marginBottom:12 }}>
                        <label style={{ fontSize:9.5, color:S.dim, marginBottom:5, display:'block' }}>
                          Notes internes
                        </label>
                        <textarea
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          rows={3}
                          placeholder="Ex: Contacté le 20/03, entrepôt 15 racks × 20 col..."
                          style={{ width:'100%', padding:'9px 12px', borderRadius:8,
                            border:`1.5px solid ${S.divider}`, fontSize:11,
                            fontFamily:S.font, outline:'none', resize:'vertical',
                            color:S.dark, background:S.white }}
                          onFocus={e => e.target.style.borderColor=S.blue}
                          onBlur={e  => e.target.style.borderColor=S.divider}
                        />
                      </div>

                      {/* Boutons statut */}
                      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                        {[
                          { status:'contacted', label:<div style={{display:'flex', alignItems:'center', gap:6}}><Mail size={12} /> Marquer comme contacté</div>, c:'#2563EB', bg:'#EFF6FF', border:'#BFDBFE' },
                          { status:'approved',  label:<div style={{display:'flex', alignItems:'center', gap:6}}><CheckCircle size={12} /> Approuver (compte créé)</div>, c:'#16A34A', bg:'#F0FDF4', border:'#BBF7D0' },
                          { status:'rejected',  label:<div style={{display:'flex', alignItems:'center', gap:6}}><XCircle size={12} /> Refuser la demande</div>,      c:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
                        ].map(btn => (
                          <button key={btn.status}
                            onClick={() => update(req.id, btn.status, notes)}
                            disabled={saving || req.status === btn.status}
                            style={{
                              padding:'9px 14px', borderRadius:8, border:`1.5px solid ${btn.border}`,
                              background: req.status===btn.status ? btn.bg : S.white,
                              color: btn.c, fontSize:10, fontWeight:600,
                              cursor: (saving||req.status===btn.status) ? 'not-allowed':'pointer',
                              fontFamily:S.font, textAlign:'left', opacity: req.status===btn.status?0.6:1,
                            }}>
                            {saving ? '...' : btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}


/* ═══════════════════════════════════════════════════ */
/*  CREATE ACCOUNT PANEL (new)                        */
/* ═══════════════════════════════════════════════════ */
function CreateAccountPanel() {
  const [form, setForm] = useState({
    company_name: '', email: '', password: '',
    warehouse_name: '', geometry_text: '', routing_text: ''
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [result,  setResult]  = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Generate a random password
  const genPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let p = ''
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)]
    set('password', p)
  }

  const submit = async () => {
    setError(''); setResult(null)
    if (!form.company_name.trim()) return setError("Nom de l'entreprise requis.")
    if (!form.email.trim())        return setError("Email requis.")
    if (form.password.length < 6)  return setError("Mot de passe (min. 6 caractères).")
    if (!form.warehouse_name.trim()) return setError("Nom de l'entrepôt requis.")

    let geometry = null
    if (form.geometry_text.trim()) {
      try {
        geometry = JSON.parse(form.geometry_text.trim())
      } catch (e) {
        return setError("Format JSON invalide pour la géométrie.")
      }
    }

    let routing = null
    if (form.routing_text.trim()) {
      try {
        routing = JSON.parse(form.routing_text.trim())
      } catch (e) {
        return setError("Format JSON invalide pour la géométrie de routing.")
      }
    }

    setLoading(true)
    try {
      const res = await api.auth.adminCreateAccount({
        company_name:   form.company_name,
        email:          form.email,
        password:       form.password,
        warehouse_name: form.warehouse_name,
        geometry_json:  geometry,
        routing_json:   routing,
      })
      setResult(res)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const inputStyle = {
    width:'100%', padding:'10px 14px', borderRadius:8, fontSize:11,
    background:S.white, border:`1.5px solid ${S.divider}`,
    color:S.dark, fontFamily:S.font, outline:'none', transition:'border-color 0.15s',
  }

  if (result) {
    return (
      <div style={{ background:'#F0FDF4', border:'2px solid #BBF7D0', borderRadius:14, padding:28, maxWidth:500 }}>
        <div style={{ marginBottom:12, display:'flex', justifyContent:'center' }}><CheckCircle size={40} color="#16A34A" /></div>
        <div style={{ fontSize:16, fontWeight:800, color:'#16A34A', marginBottom:16, textAlign:'center' }}>
          Compte créé avec succès !
        </div>
        <div style={{ background:S.white, borderRadius:10, padding:18, border:`1px solid ${S.divider}` }}>
          <div style={{ fontSize:10, color:S.dimmer, letterSpacing:'0.1em', fontWeight:600, marginBottom:10 }}>
            INFORMATIONS DU COMPTE
          </div>
          {[
            { l:'Entreprise',  v:result.company_name },
            { l:'Email',       v:result.email },
            { l:'Mot de passe',v:form.password },
            { l:'Entrepôt',    v:result.warehouse_name },
          ].map((r,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0',
              borderBottom:`1px solid ${S.divider}` }}>
              <span style={{ fontSize:10, color:S.dim }}>{r.l}</span>
              <span style={{ fontSize:11, color:S.dark, fontWeight:600, fontFamily:"'IBM Plex Mono', monospace" }}>{r.v}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop:16, padding:'10px 14px', borderRadius:8,
          background:'#EFF6FF', border:'1px solid #BFDBFE', fontSize:10, color:S.blue, display:'flex', alignItems:'center', gap:6 }}>
          <FileText size={12} /> Envoyez ces informations au client pour qu'il puisse se connecter.
        </div>
        <button onClick={() => { setResult(null); setForm({ company_name:'', email:'', password:'', warehouse_name:'', geometry_text:'', routing_text:'' }) }}
          style={{ marginTop:14, padding:'9px 18px', borderRadius:8, border:`1px solid ${S.divider}`,
            background:S.white, color:S.dim, fontSize:10, cursor:'pointer', fontFamily:S.font }}>
          ← Créer un autre compte
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth:700 }}>
      {/* Grid pour séparer l'aide visuelle du formulaire principal si l'écran est large, mais on garde la verticalité pour l'instant */}
      <div style={{ background:S.white, borderRadius:14, padding:28,
        border:`1px solid ${S.divider}`, boxShadow:S.shadow }}>

        {/* Section entreprise */}
        <div style={{ fontSize:10, fontWeight:700, color:S.blue,
          letterSpacing:'0.1em', marginBottom:16, paddingBottom:8,
          borderBottom:`1px solid ${S.divider}`, display:'flex', alignItems:'center', gap:6 }}>
          <Building size={14} /> ENTREPRISE
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div>
            <label style={{ fontSize:9.5, color:S.dim, fontWeight:600, display:'block', marginBottom:5 }}>
              Nom <span style={{ color:S.red }}>*</span>
            </label>
            <input value={form.company_name} onChange={e => set('company_name', e.target.value)}
              placeholder="Numilog Algérie" style={inputStyle}
              onFocus={e => e.target.style.borderColor=S.blue}
              onBlur={e  => e.target.style.borderColor=S.divider}/>
          </div>
          <div>
            <label style={{ fontSize:9.5, color:S.dim, fontWeight:600, display:'block', marginBottom:5 }}>
              Email <span style={{ color:S.red }}>*</span>
            </label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="contact@entreprise.dz" style={inputStyle}
              onFocus={e => e.target.style.borderColor=S.blue}
              onBlur={e  => e.target.style.borderColor=S.divider}/>
          </div>
        </div>

        <div style={{ marginBottom:14, marginTop:14 }}>
          <label style={{ fontSize:9.5, color:S.dim, fontWeight:600, display:'block', marginBottom:5 }}>
            Mot de passe <span style={{ color:S.red }}>*</span>
          </label>
          <div style={{ display:'flex', gap:8 }}>
            <input value={form.password} onChange={e => set('password', e.target.value)}
              placeholder="Min. 6 caractères" style={{ ...inputStyle, width:'200px', fontFamily:"'IBM Plex Mono', monospace" }}
              onFocus={e => e.target.style.borderColor=S.blue}
              onBlur={e  => e.target.style.borderColor=S.divider}/>
            <button onClick={genPassword} style={{
              padding:'8px 14px', borderRadius:8, border:`1px solid ${S.divider}`,
              background:'#EFF6FF', color:S.blue, fontSize:9, fontWeight:600,
              cursor:'pointer', fontFamily:S.font, whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6
            }}><Key size={10} /> Générer auto</button>
          </div>
        </div>

        {/* Section entrepôt */}
        <div style={{ fontSize:10, fontWeight:700, color:S.blue,
          letterSpacing:'0.1em', marginBottom:16, paddingBottom:8,
          borderBottom:`1px solid ${S.divider}`, marginTop:24, display:'flex', alignItems:'center', gap:6 }}>
          <Boxes size={14} /> GÉOMÉTRIE DE L'ENTREPÔT (JSON Modélisé)
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:9.5, color:S.dim, fontWeight:600, display:'block', marginBottom:5 }}>
            Nom de l'entrepôt <span style={{ color:S.red }}>*</span>
          </label>
          <input value={form.warehouse_name} onChange={e => set('warehouse_name', e.target.value)}
            placeholder="Ex: Cellule principale" style={inputStyle}
            onFocus={e => e.target.style.borderColor=S.blue}
            onBlur={e  => e.target.style.borderColor=S.divider}/>
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:9.5, color:S.dim, fontWeight:600, display:'block', marginBottom:5 }}>
            Graphe JSON (Racks, Nœuds, Coordonnées)
          </label>
          <textarea value={form.geometry_text} onChange={e => set('geometry_text', e.target.value)}
            placeholder={'{\n  "vertical_racks": [\n    { "name": "D14", "short_name": "D", "cols": 18, "face": "left", "group": "Zone A" },\n    { "name": "E14", "short_name": "E", "cols": 18, "face": "right", "group": "Zone A" },\n    { "name": "F14", "short_name": "F", "cols": 18, "face": "left", "group": "Zone B" },\n    { "name": "G14", "short_name": "G", "cols": 18, "face": "right", "group": "Zone B" }\n  ],\n  "horizontal_racks": [\n    { "name": "A14", "cols": 10, "position": "start" }\n  ]\n}'}
            rows={16}
            style={{ ...inputStyle, resize:'vertical', fontFamily:"'IBM Plex Mono', monospace" }}
            onFocus={e => e.target.style.borderColor=S.blue}
            onBlur={e  => e.target.style.borderColor=S.divider}/>
          <div style={{ fontSize:8.5, color:S.dimmer, marginTop:4 }}>
            Format : vertical_racks (left/right, short_name optionnel, group optionnel), horizontal_racks (start/end).
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:9.5, color:S.dim, fontWeight:600, display:'block', marginBottom:5 }}>
            GÉOMÉTRIE DE ROUTING (Graph CAO JSON)
          </label>
          <textarea value={form.routing_text} onChange={e => set('routing_text', e.target.value)}
            placeholder={'{\n  "schema": "warehouse-cad-v3",\n  "nodes": [...],\n  "edges": [...]\n}'}
            rows={10}
            style={{ ...inputStyle, resize:'vertical', fontFamily:"'IBM Plex Mono', monospace" }}
            onFocus={e => e.target.style.borderColor=S.blue}
            onBlur={e  => e.target.style.borderColor=S.divider}/>
          <div style={{ fontSize:8.5, color:S.dimmer, marginTop:4 }}>
            Collez ici le JSON généré par l'outil de cartographie (nœuds et arêtes). Optionnel.
          </div>
        </div>

        {error && (
          <div style={{ padding:'10px 14px', borderRadius:8, marginTop:24,
            background:'#FEF2F2', border:'1px solid #FECACA',
            fontSize:10, color:S.red, display:'flex', alignItems:'center', gap:6 }}><AlertTriangle size={12} /> {error}</div>
        )}

        <button onClick={submit} disabled={loading} style={{
          width:'100%', padding:'14px', borderRadius:10, border:'none', marginTop:24,
          background: loading ? '#BFDBFE' : 'linear-gradient(135deg,#1E40AF,#3B82F6)',
          color:'#fff', fontSize:13, fontWeight:700, letterSpacing:'0.03em',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily:S.font, transition:'all 0.2s',
          boxShadow: loading ? 'none' : '0 4px 12px rgba(30,64,175,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}>
          {loading ? <><Loader2 size={14} className="spin" /> Création en cours...</> : <><Rocket size={14} /> Valider & Créer l'entrepôt client</>}
        </button>
      </div>
    </div>
  )
}