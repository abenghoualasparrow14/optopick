import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { S } from '../components/styles'
import { Loading, ErrorBox } from '../components/Widgets'
import { UploadCloud, Map as MapIcon, Boxes, Route, Building2 } from 'lucide-react'

export default function DashboardPage() {
  const { company } = useAuth()
  const nav = useNavigate()
  const [warehouses, setWarehouses] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [newName,    setNewName]    = useState('')
  const [creating,   setCreating]   = useState(false)

  useEffect(() => { load() }, [])

  const load = () => {
    setLoading(true)
    api.warehouses.list()
      .then(setWarehouses).catch(e => setError(e.message)).finally(() => setLoading(false))
  }

  const create = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try { await api.warehouses.create(newName.trim()); setNewName(''); load() }
    catch(e) { setError(e.message) }
    finally { setCreating(false) }
  }

  const MODULES = [
    { icon:<UploadCloud size={24} strokeWidth={2.5} />, label:'Importer données', sub:'Excel / CSV',    path:'/upload',   color:'#1E40AF', bg:'#EFF6FF' },
    { icon:<MapIcon size={24} strokeWidth={2.5} />, label:'Heatmap',          sub:'Plan interactif', path:'/heatmap',  color:'#0284C7', bg:'#F0F9FF' },
    { icon:<Boxes size={24} strokeWidth={2.5} />, label:'Slotting ABC',     sub:'Reslotting',      path:'/slotting', color:'#DC2626', bg:'#FEF2F2' },
    { icon:<Route size={24} strokeWidth={2.5} />, label:'Routing TSP',      sub:'Trajet optimal',  path:'/routing',  color:'#16A34A', bg:'#F0FDF4' },
  ]

  return (
    <div>
      {/* Bienvenue */}
      <div style={{
        padding:'24px 28px', borderRadius:20, marginBottom:28,
        background:'linear-gradient(135deg,#1E40AF 0%,#3B82F6 100%)',
        color:S.white, boxShadow:'0 10px 30px rgba(30,64,175,0.15)',
      }}>
        <div style={{ fontSize:18, fontWeight:700, marginBottom:4 }}>
          Bonjour, {company?.name} 👋
        </div>
        <div style={{ fontSize:11, opacity:0.85 }}>
          Bienvenue sur OptoPick — optimisez vos opérations de picking dès aujourd'hui.
        </div>
      </div>

      {/* Modules */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
        {MODULES.map(m => (
          <button key={m.path} onClick={() => nav(m.path)} style={{
            padding:'20px 18px', borderRadius:16,
            border:`1px solid rgba(0,0,0,0.04)`,
            background:m.bg, cursor:'pointer', fontFamily:S.font, textAlign:'left',
            transition:'all 0.2s', boxShadow:'0 2px 8px rgba(0,0,0,0.03)',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow=`0 4px 16px ${m.color}22`; e.currentTarget.style.transform='translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform='none' }}>
            <div style={{ marginBottom:10, color:m.color, display:'flex', alignItems:'center' }}>{m.icon}</div>
            <div style={{ fontSize:12, fontWeight:700, color:m.color, marginBottom:2 }}>{m.label}</div>
            <div style={{ fontSize:9, color:S.dim }}>{m.sub}</div>
          </button>
        ))}
      </div>

      <div style={{ background:S.white, border:`1px solid rgba(0,0,0,0.05)`, borderRadius:20, padding:24, boxShadow:S.shadow }}>
        <div style={{ fontSize:15, fontWeight:700, color:S.dark, marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
          <Building2 size={20} color={S.dim} strokeWidth={2.5} /> Mes entrepôts
        </div>

        {/* Créer */}
        <div style={{ display:'flex', gap:10, marginBottom:18 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key==='Enter' && create()}
            placeholder="Nom du nouvel entrepôt (ex: Cellule 14)"
            style={{ flex:1, padding:'9px 13px', borderRadius:8, fontSize:11,
              background:S.white, border:`1.5px solid ${S.divider}`,
              color:S.dark, fontFamily:S.font, outline:'none' }}
            onFocus={e  => e.target.style.borderColor=S.blue}
            onBlur={e   => e.target.style.borderColor=S.divider}
          />
          <button onClick={create} disabled={creating} style={{
            padding:'11px 22px', borderRadius:10, border:'none',
            background:'linear-gradient(135deg,#1E40AF,#3B82F6)',
            color:S.white, fontSize:12, fontWeight:600,
            cursor:'pointer', fontFamily:S.font,
            boxShadow:'0 4px 12px rgba(30,64,175,0.2)', transition:'all 0.2s'
          }}>
            {creating ? '...' : '+ Créer'}
          </button>
        </div>

        {loading && <Loading />}
        {error   && <ErrorBox message={error} />}

        {!loading && warehouses.length === 0 && (
          <div style={{ textAlign:'center', padding:'32px', color:S.dimmer, fontSize:11 }}>
            Aucun entrepôt créé. Commencez par en créer un ci-dessus.
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {warehouses.map(w => (
            <div key={w.id} style={{
              display:'flex', alignItems:'center', gap:16,
              padding:'14px 20px', borderRadius:12,
              background:S.bg, border:`1px solid rgba(0,0,0,0.04)`,
              transition:'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow=S.shadow}
            onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
              <div style={{
                width:44, height:44, borderRadius:12,
                background:'#EFF6FF', border:`1px solid #BFDBFE`, color:'#3B82F6',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}><Building2 size={22} strokeWidth={2} /></div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, color:S.dark, marginBottom: 2 }}>{w.name}</div>
                <div style={{ fontSize:10.5, color:S.dimmer }}>
                  ID: {w.id} · Créé le {new Date(w.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
              <button onClick={() => nav('/upload')} style={{
                padding:'8px 16px', borderRadius:8, display:'flex', alignItems:'center', gap:6,
                border:`1px solid rgba(0,0,0,0.06)`, background:S.white,
                color:S.dark, fontSize:11, cursor:'pointer', fontFamily:S.font, fontWeight:600,
                boxShadow:'0 2px 4px rgba(0,0,0,0.02)', transition:'all 0.2s'
              }}>
                <UploadCloud size={14} /> Importer
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}