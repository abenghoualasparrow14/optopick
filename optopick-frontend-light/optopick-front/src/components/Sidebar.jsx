import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { S } from './styles'
import { Home, UploadCloud, Map as MapIcon, Boxes, Route, Settings2, Settings, LogOut } from 'lucide-react'

const NAV = [
  { path:'/dashboard', icon:<Home size={18} strokeWidth={2.5} />, label:'Dashboard',  sub:'Vue générale' },
  { path:'/upload',    icon:<UploadCloud size={18} strokeWidth={2.5} />, label:'Import',      sub:'Charger vos données' },
  { path:'/heatmap',   icon:<MapIcon size={18} strokeWidth={2.5} />, label:'Heatmap',     sub:'Plan & activité' },
  { path:'/slotting',  icon:<Boxes size={18} strokeWidth={2.5} />, label:'Slotting',    sub:'Analyse ABC' },
  { path:'/routing',   icon:<Route size={18} strokeWidth={2.5} />, label:'Routing',     sub:'Trajet optimal' },
  { path:'/admin',     icon:<Settings2 size={18} strokeWidth={2.5} />, label:'Admin',       sub:'Demandes d\'accès', adminOnly: true },
  { path:'/settings',  icon:<Settings size={18} strokeWidth={2.5} />, label:'Paramètres', sub:'Infos & Sécurité' },
]

export default function Sidebar() {
  const nav      = useNavigate()
  const location = useLocation()
  const { company, logout, isAdmin } = useAuth()

  const visibleNav = NAV.filter(n => !n.adminOnly || isAdmin)

  return (
    <div style={{
      position:'fixed', left:0, top:0, bottom:0, width:220,
      background:S.white, borderRight:`1px solid rgba(0,0,0,0.06)`,
      boxShadow:'4px 0 24px rgba(0,0,0,0.02)',
      zIndex:100, display:'flex', flexDirection:'column',
    }}>
      <div style={{ padding:'24px 20px 20px', borderBottom:`1px solid rgba(0,0,0,0.06)` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <img src="/assets/logo.svg" alt="OptoPick" style={{ width:32, height:32 }} />
          <div style={{ fontSize:18, fontWeight:800, color:S.dark, letterSpacing:'-0.03em' }}>
            OPTO<span style={{ color:S.blue }}>PICK</span>
          </div>
        </div>
        {company && (
          <div style={{ fontSize:10, color:S.white, fontWeight:600,
            background:S.blue, padding:'4px 12px', borderRadius:20, display:'inline-block' }}>
            {company.name}
          </div>
        )}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 12px', display:'flex', flexDirection:'column', gap:4 }}>
        <div style={{ fontSize:10, color:S.dimmer, fontWeight:600,
          padding:'0 10px', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>MODULES</div>
        {visibleNav.map(n => {
          const active = location.pathname === n.path
          return (
            <button key={n.path} onClick={() => nav(n.path)} style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'10px 12px', borderRadius:10, border:'none',
              background: active ? '#EFF6FF' : 'transparent',
              cursor:'pointer', fontFamily:S.font, textAlign:'left',
              transition:'all 0.2s ease', width:'100%',
              borderLeft: active ? `3px solid ${S.blue}` : '3px solid transparent',
            }}
            onMouseEnter={e => !active && (e.currentTarget.style.background='#F8FAFC')}
            onMouseLeave={e => !active && (e.currentTarget.style.background='transparent')}>
              <div style={{ color: active ? S.blue : S.dim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n.icon}</div>
              <div>
                <div style={{ fontSize:12, fontWeight: active?600:500,
                  color: active ? S.blue : S.text }}>{n.label}</div>
                <div style={{ fontSize:9.5, color: active ? '#60A5FA' : S.dim, marginTop:2 }}>{n.sub}</div>
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ padding:'16px 20px', borderTop:`1px solid rgba(0,0,0,0.06)` }}>
        <div style={{ fontSize:10, color:S.dimmer, marginBottom:12, lineHeight:1.6 }}>
          <div style={{ fontWeight:600, color:S.dim, marginBottom:2 }}>OptoPick v1.0</div>
          <div>Warehouse Intelligence</div>
        </div>
        <button onClick={logout} style={{
          width:'100%', padding:'8px', borderRadius:8,
          border:`1px solid rgba(0,0,0,0.08)`, background:'transparent',
          color:S.dim, fontSize:11, cursor:'pointer', fontFamily:S.font, fontWeight: 500,
          transition:'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
        }}
        onMouseEnter={e => { e.currentTarget.style.background='#FEF2F2'; e.currentTarget.style.color='#DC2626'; e.currentTarget.style.borderColor='#FECACA' }}
        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color=S.dim; e.currentTarget.style.borderColor='rgba(0,0,0,0.08)' }}>
          <LogOut size={14} /> Déconnexion
        </button>
      </div>
    </div>
  )
}