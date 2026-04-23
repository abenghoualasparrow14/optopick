import { S } from './styles'
import { AlertTriangle, Inbox } from 'lucide-react'

export function Loading({ text = 'Chargement...' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, gap:14 }}>
      <div style={{
        width:24, height:24, borderRadius:'50%',
        border:`3px solid rgba(0,0,0,0.05)`,
        borderTopColor: S.blue,
        animation:'spin 0.8s linear infinite',
      }}/>
      <span style={{ fontSize:13, color:S.dim, fontWeight: 500 }}>{text}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export function ErrorBox({ message }) {
  return (
    <div style={{
      padding:'16px 20px', borderRadius:12, margin:'16px 0',
      background:'#FEF2F2', border:'1px solid #FECACA', display:'flex', gap:12, alignItems:'flex-start'
    }}>
      <div style={{ marginTop: -2 }}><AlertTriangle size={22} color="#DC2626" /></div>
      <div>
        <div style={{ fontSize:12, color:'#DC2626', fontWeight:700, marginBottom:4 }}>Une erreur est survenue</div>
        <div style={{ fontSize:11, color:'#7F1D1D', lineHeight: 1.5 }}>{message}</div>
      </div>
    </div>
  )
}

export function EmptyState({ icon=<Inbox size={48} strokeWidth={1.5} color={S.dimmer} />, text='Aucune donnée', sub='' }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:260, gap:12, background: 'rgba(0,0,0,0.01)', borderRadius: 16, border: '1px dashed rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <div style={{ fontSize:14, color:S.dim, fontWeight:600 }}>{text}</div>
      {sub && <div style={{ fontSize:12, color:S.dimmer, textAlign:'center', maxWidth: 300, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}