import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { S } from '../components/styles'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const { login } = useAuth()
  const nav = useNavigate()

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const submit = async () => {
    setError('')
    if (!email.trim()) return setError("L'email est obligatoire.")
    if (!validateEmail(email)) return setError("L'adresse email n'est pas valide.")
    if (password.length < 6) return setError("Le mot de passe doit contenir au moins 6 caractères.")

    setLoading(true)
    try {
      const res = await api.auth.login(email, password)
      login(res.access_token, {})
      nav('/dashboard')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const inp = (val, set, placeholder, type = 'text') => (
    <input type={type} value={val} placeholder={placeholder}
      onChange={e => set(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && submit()}
      style={{
        width: '100%', padding: '12px 16px', borderRadius: 12, marginBottom: 14,
        background: '#F8FAFC', border: `1.5px solid rgba(0,0,0,0.06)`,
        color: S.dark, fontSize: 13, fontFamily: S.font, outline: 'none',
        transition: 'all 0.2s',
      }}
      onFocus={e => { e.target.style.borderColor = S.blue; e.target.style.background = S.white; }}
      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.06)'; e.target.style.background = '#F8FAFC'; }}
    />
  )

  return (
    <div style={{
      minHeight: '100vh', background: S.bg, fontFamily: S.font,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Décoration fond */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(30,64,175,0.08) 0%, transparent 70%)',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: 420, padding: '40px 36px', borderRadius: 24,
        background: S.white, boxShadow: S.shadowMd,
        border: `1px solid rgba(0,0,0,0.06)`,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/assets/logo.svg" alt="OptoPick" style={{ width: 48, height: 48, margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 24, fontWeight: 800, color: S.dark, letterSpacing: '-0.02em' }}>
            OPTO<span style={{ color: S.blue }}>PICK</span>
          </div>
          <div style={{ fontSize: 10, color: S.dimmer, marginTop: 4 }}>
            Warehouse Intelligence Platform
          </div>
        </div>

        {/* Titre */}
        <div style={{
          textAlign: 'center', marginBottom: 24,
          fontSize: 13, fontWeight: 600, color: S.dim,
        }}>
          Connectez-vous à votre espace
        </div>

        {inp(email, setEmail, 'Adresse email', 'email')}
        {inp(password, setPassword, 'Mot de passe', 'password')}

        {error && (
          <div style={{
            padding: '9px 12px', borderRadius: 8, marginBottom: 12,
            background: '#FEF2F2', border: '1px solid #FECACA',
            fontSize: 10, color: '#DC2626',
          }}>
            {error}
          </div>
        )}

        <button onClick={submit} disabled={loading} style={{
          width: '100%', padding: '14px', borderRadius: 12, border: 'none',
          background: loading ? '#BFDBFE' : 'linear-gradient(135deg,#1E40AF,#3B82F6)',
          color: S.white, fontSize: 14, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: S.font, transition: 'all 0.2s',
          boxShadow: loading ? 'none' : '0 6px 16px rgba(30,64,175,0.2)',
          marginTop: 8
        }}>
          {loading ? 'Chargement...' : 'Se connecter →'}
        </button>

        {/* Lien vers demande d'accès */}
        <div style={{
          textAlign: 'center', marginTop: 18,
          fontSize: 11, color: S.dimmer, lineHeight: 1.7,
        }}>
          Vous n'avez pas de compte ?{' '}
          <a href="/" style={{ color: S.blue, fontWeight: 600, textDecoration: 'none' }}>
            Demander un compte
          </a>
        </div>
      </div>
    </div>
  )
}