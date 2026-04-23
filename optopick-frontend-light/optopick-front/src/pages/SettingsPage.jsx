import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

import { S } from '../components/styles'

export default function SettingsPage() {
  const { company } = useAuth()
  
  // Tab state
  const [activeTab, setActiveTab] = useState('info') // 'info' or 'password'

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  
  // UI states
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    // Load current un-cached company details
    api.auth.me().then(data => {
      setName(data.name || '')
      setEmail(data.email || '')
      setPhone(data.phone || '')
    }).catch(err => console.error("Could not load profile", err))
  }, [])

  const handleUpdateInfo = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      await api.auth.updateAccount({ name, email, phone })
      setMsg('Informations mises à jour avec succès.')
    } catch (err) {
      setMsg(err.message || 'Erreur lors de la mise à jour.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      await api.auth.changePassword({ old_password: oldPass, new_password: newPass })
      setMsg('Mot de passe mis à jour avec succès.')
      setOldPass('')
      setNewPass('')
    } catch (err) {
      setMsg(err.message || 'Erreur lors de la mise à jour.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 40, maxWidth: 600 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: S.text, marginBottom: 8 }}>Paramètres (Settings)</h1>
      <p style={{ color: S.dimmer, fontSize: 13, marginBottom: 32 }}>Gérez les informations de votre compte et votre sécurité.</p>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 24, borderBottom: `1px solid rgba(0,0,0,0.06)` }}>
        <button onClick={() => {setActiveTab('info'); setMsg('')}} style={{
          padding: '10px 16px', border: 'none', background: 'transparent',
          fontSize: 14, fontWeight: 600, color: activeTab === 'info' ? S.blue : S.dim,
          borderBottom: activeTab === 'info' ? `2px solid ${S.blue}` : '2px solid transparent',
          cursor: 'pointer'
        }}>Account informations</button>
        <button onClick={() => {setActiveTab('password'); setMsg('')}} style={{
          padding: '10px 16px', border: 'none', background: 'transparent',
          fontSize: 14, fontWeight: 600, color: activeTab === 'password' ? S.blue : S.dim,
          borderBottom: activeTab === 'password' ? `2px solid ${S.blue}` : '2px solid transparent',
          cursor: 'pointer'
        }}>Change my password</button>
      </div>

      <div style={{ background: S.white, padding: 32, borderRadius: 16, border: '1px solid rgba(0,0,0,0.05)', boxShadow: S.shadow }}>
        
        {activeTab === 'info' && (
          <form onSubmit={handleUpdateInfo}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: S.text, marginBottom: 6 }}>Nom de l'entreprise</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                     style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid rgba(0,0,0,0.06)`, background: '#F8FAFC', fontSize: 14, fontFamily: S.font, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: S.text, marginBottom: 6 }}>Email de contact</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                     style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid rgba(0,0,0,0.06)`, background: '#F8FAFC', fontSize: 14, fontFamily: S.font, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: S.text, marginBottom: 6 }}>Numéro de téléphone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                     placeholder="+213 555 12 34 56"
                     style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid rgba(0,0,0,0.06)`, background: '#F8FAFC', fontSize: 14, fontFamily: S.font, outline: 'none' }} />
            </div>
            <button type="submit" disabled={loading} style={{
              background: 'linear-gradient(135deg,#1E40AF,#3B82F6)', color: S.white, padding: '12px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: S.font
            }}>
              {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>
        )}

        {activeTab === 'password' && (
          <form onSubmit={handleUpdatePassword}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: S.text, marginBottom: 6 }}>Ancien mot de passe</label>
              <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} required
                     style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid rgba(0,0,0,0.06)`, background: '#F8FAFC', fontSize: 14, fontFamily: S.font, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: S.text, marginBottom: 6 }}>Nouveau mot de passe</label>
              <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required minLength={6}
                     style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid rgba(0,0,0,0.06)`, background: '#F8FAFC', fontSize: 14, fontFamily: S.font, outline: 'none' }} />
            </div>
            <button type="submit" disabled={loading} style={{
              background: 'linear-gradient(135deg,#1E40AF,#3B82F6)', color: S.white, padding: '12px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: S.font
            }}>
              {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        )}

        {msg && (
          <div style={{ marginTop: 24, padding: '12px', borderRadius: 6, fontSize: 13, 
                        background: msg.includes('succès') ? '#ecfdf5' : '#fef2f2',
                        color: msg.includes('succès') ? '#059669' : '#dc2626' }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  )
}
