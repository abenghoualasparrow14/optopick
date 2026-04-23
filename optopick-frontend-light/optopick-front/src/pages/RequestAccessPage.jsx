import { useState } from 'react'
import { S } from '../components/styles'
import { CheckCircle, Mail, Factory, Building, User, AlertTriangle, Loader2, Rocket, Zap, ShieldCheck, Target } from 'lucide-react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function RequestAccessPage() {
  const [form, setForm] = useState({
    company_name: '', email: '', phone: '',
    company_phone: '', website: '', message: '',
  })
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    if (!form.company_name.trim()) return "Le nom de l'entreprise est obligatoire."
    if (!form.email.trim())        return "L'email est obligatoire."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Email invalide."
    if (!form.phone.trim())        return "Le numéro de téléphone est obligatoire."
    return null
  }

  const submit = async () => {
    const err = validate()
    if (err) return setError(err)
    setError(''); setLoading(true)
    try {
      const res = await fetch(`${BASE}/requests/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Erreur serveur')
      setSuccess(true)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const inp = (label, key, placeholder, type='text', required=true, hint='') => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 9.5, color: S.dim, fontWeight: 600,
        letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
        {label} {required && <span style={{ color: S.red }}>*</span>}
      </label>
      <input
        type={type} value={form[key]} placeholder={placeholder}
        onChange={e => set(key, e.target.value)}
        style={{
          width: '100%', padding: '11px 14px', borderRadius: 9,
          background: S.white, border: `1.5px solid ${S.divider}`,
          color: S.dark, fontSize: 12, fontFamily: S.font, outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = S.blue}
        onBlur={e  => e.target.style.borderColor = S.divider}
      />
      {hint && <div style={{ fontSize: 8.5, color: S.dimmer, marginTop: 4 }}>{hint}</div>}
    </div>
  )

  if (success) return (
    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: S.font,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 480, padding: 40, borderRadius: 18,
        background: S.white, boxShadow: S.shadowMd,
        border: '1px solid #BBF7D0', textAlign: 'center' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><CheckCircle size={52} color="#16A34A" /></div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#16A34A', marginBottom: 10 }}>
          Demande envoyée !
        </div>
        <div style={{ fontSize: 12, color: S.dim, lineHeight: 1.8, marginBottom: 24 }}>
          Nous avons bien reçu votre demande.<br/>
          Notre équipe vous contactera dans les <strong>48 heures</strong><br/>
          pour discuter de vos besoins et configurer votre compte.
        </div>
        <div style={{ padding: '14px 20px', borderRadius: 10,
          background: '#F0FDF4', border: '1px solid #BBF7D0',
          fontSize: 11, color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Mail size={14} /> Un email de confirmation a été enregistré pour <strong>{form.email}</strong>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: S.font,
      background: 'linear-gradient(135deg, #F0F4F8 0%, #E8F0FE 100%)' }}>

      {/* Header public */}
      <div style={{ background: S.white, borderBottom: `1px solid ${S.divider}`,
        padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 1px 6px rgba(30,64,175,0.06)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 9,
          background: 'linear-gradient(135deg,#1E40AF,#3B82F6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(30,64,175,0.3)' }}><Factory size={20} color="#fff" /></div>
        <div style={{ fontSize: 18, fontWeight: 800, color: S.dark }}>
          OPTO<span style={{ color: S.blue }}>PICK</span>
        </div>
        <div style={{ fontSize: 10, color: S.dimmer, marginLeft: 4 }}>
          Warehouse Intelligence Platform
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 20px' }}>

        {/* Titre */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: S.dark,
            letterSpacing: '-0.02em', marginBottom: 10 }}>
            Demander un accès
          </div>
          <div style={{ fontSize: 12, color: S.dim, lineHeight: 1.8 }}>
            Remplissez ce formulaire et notre équipe vous contactera<br/>
            pour configurer votre espace OptoPick personnalisé.
          </div>
        </div>

        {/* Formulaire */}
        <div style={{ background: S.white, borderRadius: 16, padding: '32px 32px 28px',
          boxShadow: S.shadowMd, border: `1px solid ${S.divider}` }}>

          {/* Section entreprise */}
          <div style={{ fontSize: 10, fontWeight: 700, color: S.blue,
            letterSpacing: '0.1em', marginBottom: 16, paddingBottom: 8,
            borderBottom: `1px solid ${S.divider}`, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building size={14} /> INFORMATIONS ENTREPRISE
          </div>

          {inp("Nom de l'entreprise", "company_name", "Ex: Numilog Algérie")}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              {inp("Téléphone contact", "phone", '+213 6XX XXX XXX')}
            </div>
            <div>
              {inp("Téléphone entreprise", "company_phone", '+213 2X XXX XXXX', 'tel', false)}
            </div>
          </div>

          {inp("Site web", 'website', 'https://www.entreprise.dz', 'url', false,
            "Optionnel — si votre entreprise en possède un")}

          {/* Section contact */}
          <div style={{ fontSize: 10, fontWeight: 700, color: S.blue,
            letterSpacing: '0.1em', marginBottom: 16, paddingBottom: 8,
            borderBottom: `1px solid ${S.divider}`, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={14} /> CONTACT RESPONSABLE
          </div>

          {inp("Email professionnel", 'email', 'responsable@entreprise.dz', 'email')}

          {/* Message optionnel */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 9.5, color: S.dim, fontWeight: 600,
              letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
              MESSAGE (optionnel)
            </label>
            <textarea
              value={form.message}
              onChange={e => set('message', e.target.value)}
              placeholder="Décrivez brièvement votre entrepôt, vos besoins..."
              rows={3}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 9, resize: 'vertical',
                background: S.white, border: `1.5px solid ${S.divider}`,
                color: S.dark, fontSize: 12, fontFamily: S.font, outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = S.blue}
              onBlur={e  => e.target.style.borderColor = S.divider}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: '#FEF2F2', border: '1px solid #FECACA',
              fontSize: 10.5, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={12} /> {error}
            </div>
          )}

          <button onClick={submit} disabled={loading} style={{
            width: '100%', padding: '13px', borderRadius: 10, border: 'none',
            background: loading ? '#BFDBFE' : 'linear-gradient(135deg,#1E40AF,#3B82F6)',
            color: loading ? '#93C5FD' : S.white,
            fontSize: 13, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: S.font, transition: 'all 0.2s',
            boxShadow: loading ? 'none' : '0 3px 12px rgba(30,64,175,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
            {loading ? <><Loader2 size={14} className="spin" /> Envoi en cours...</> : <><Rocket size={14} /> Envoyer la demande</>}
          </button>

          <div style={{ textAlign: 'center', marginTop: 14,
            fontSize: 9.5, color: S.dimmer, lineHeight: 1.7 }}>
            Vous avez déjà un compte ?{' '}
            <a href='/login' style={{ color: S.blue, fontWeight: 600, textDecoration: 'none' }}>
              Se connecter
            </a>
          </div>
        </div>

        {/* Infos rassurantes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: 12, marginTop: 24 }}>
          {[
            { icon: <Zap size={22} color={S.blue} />, title: 'Rapide', desc: 'Réponse sous 48h' },
            { icon: <ShieldCheck size={22} color={S.blue} />, title: 'Sécurisé', desc: 'Données confidentielles' },
            { icon: <Target size={22} color={S.blue} />, title: 'Personnalisé', desc: 'Config sur mesure' },
          ].map((f, i) => (
            <div key={i} style={{ padding: '14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.7)', border: `1px solid ${S.divider}`,
              textAlign: 'center' }}>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{f.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: S.dark }}>{f.title}</div>
              <div style={{ fontSize: 9, color: S.dimmer, marginTop: 2 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}