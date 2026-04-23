import Sidebar from './Sidebar'
import { S } from './styles'
import { useLocation } from 'react-router-dom'

const TITLES = {
  '/dashboard': { title:'Dashboard',           sub:'Vue générale de votre entrepôt' },
  '/upload':    { title:'Import de données',    sub:'Chargez votre fichier Excel ou CSV' },
  '/heatmap':   { title:'Heatmap',              sub:'Plan réel · Fréquence de picking par emplacement' },
  '/slotting':  { title:'Analyse Slotting',     sub:'Classification ABC · Plan de reslotting par échange' },
  '/routing':   { title:'Routing optimal',      sub:'Trajet TSP · Distance minimale par préparation' },
  '/admin':     { title:'Administration',       sub:'Gestion des demandes d\'accès clients' },
}

export default function Layout({ children }) {
  const location = useLocation()
  const meta = TITLES[location.pathname] || { title:'OptoPick', sub:'' }

  return (
    <div style={{ minHeight:'100vh', background:S.bg, fontFamily:S.font, color:S.text }}>
      <Sidebar />
      <div style={{ marginLeft:210, minHeight:'100vh' }}>
        <div style={{
          position:'sticky', top:0, zIndex:50,
          background:'rgba(255,255,255,0.85)', backdropFilter:'blur(12px)',
          borderBottom:`1px solid rgba(0,0,0,0.06)`, padding:'18px 32px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <div style={{ fontSize:19, fontWeight:700, color:S.dark, letterSpacing:'-0.01em' }}>
              {meta.title}
            </div>
            <div style={{ fontSize:10, color:S.dimmer, marginTop:3, fontWeight: 500 }}>
              {meta.sub}
            </div>
          </div>
          <div style={{ fontSize:10, color:S.dim, padding:'6px 14px', fontWeight:500,
            borderRadius:20, background:S.card, border:`1px solid rgba(0,0,0,0.06)` }}>
            OptoPick · v1.0
          </div>
        </div>
        <div style={{ padding:'32px 32px' }}>{children}</div>
      </div>
    </div>
  )
}