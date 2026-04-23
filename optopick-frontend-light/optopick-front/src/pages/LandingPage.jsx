import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map as MapIcon, Boxes, Route, UploadCloud, FileText, Settings, Rocket, CheckCircle, Mail, Building, User } from 'lucide-react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const C = {
  blue:    '#1E40AF',
  blueL:   '#3B82F6',
  dark:    '#0F172A',
  text:    '#1E293B',
  dim:     '#64748B',
  dimmer:  '#94A3B8',
  divider: '#E2E8F0',
  bg:      '#F0F4F8',
  white:   '#FFFFFF',
  green:   '#16A34A',
  red:     '#DC2626',
  font:    "'Inter','Segoe UI',system-ui,sans-serif",
}

/* ───────── Landing Page ───────── */
export default function LandingPage() {
  return (
    <div style={{ fontFamily: C.font, color: C.text, background: C.white }}>
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <FormSection />
      <Footer />
    </div>
  )
}

/* ───────── Navbar ───────── */
function Navbar() {
  const nav = useNavigate()
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${C.divider}`,
      padding: '0 40px', height: 64,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/assets/logo.svg" alt="OptoPick" style={{ width: 34, height: 34 }} />
        <span style={{ fontSize: 20, fontWeight: 800, color: C.dark, letterSpacing: '-0.03em' }}>
          OPTO<span style={{ color: C.blue }}>PICK</span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <a href="#features" style={{ fontSize: 13, color: C.dim, textDecoration: 'none', fontWeight: 500 }}>Fonctionnalités</a>
        <a href="#how" style={{ fontSize: 13, color: C.dim, textDecoration: 'none', fontWeight: 500 }}>Comment ça marche</a>
        <a href="#contact" style={{ fontSize: 13, color: C.dim, textDecoration: 'none', fontWeight: 500 }}>Demander un compte</a>
        <button onClick={() => nav('/login')} style={{
          padding: '9px 22px', borderRadius: 8, border: `1.5px solid ${C.blue}`,
          background: 'transparent', color: C.blue, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: C.font, transition: 'all 0.2s',
        }}>Se connecter</button>
      </div>
    </nav>
  )
}

/* ───────── Hero ───────── */
function Hero() {
  return (
    <section style={{
      padding: '100px 40px 80px', textAlign: 'center',
      background: 'linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative circles */}
      <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(30,64,175,0.06) 0%, transparent 70%)',
        top:-150, left:-100, pointerEvents:'none' }}/>
      <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
        bottom:-100, right:-50, pointerEvents:'none' }}/>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto' }}>
        <div style={{
          display:'inline-block', padding:'6px 18px', borderRadius:20,
          background:'#EFF6FF', border:'1px solid #BFDBFE', marginBottom:20,
          fontSize:12, fontWeight:600, color:C.blue, letterSpacing:'0.02em',
        }}>
          🚀 Warehouse Intelligence Platform
        </div>
        <h1 style={{
          fontSize: 48, fontWeight: 900, color: C.dark,
          lineHeight: 1.15, letterSpacing: '-0.03em', margin: '0 0 20px',
        }}>
          Optimisez votre<br/>
          <span style={{
            background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>picking en entrepôt</span>
        </h1>
        <p style={{
          fontSize: 17, color: C.dim, lineHeight: 1.7,
          maxWidth: 540, margin: '0 auto 36px',
        }}>
          OptoPick analyse vos données de préparation de commandes pour réduire les distances
          parcourues, optimiser le slotting et améliorer la productivité de vos opérateurs.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
          <a href="#contact" style={{
            padding: '14px 32px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg,#1E40AF,#3B82F6)',
            color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(30,64,175,0.35)',
            transition: 'all 0.2s', cursor: 'pointer',
          }}>
            Demander un compte →
          </a>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 50, marginTop: 60,
        }}>
          {[
            { v: '30%', l: 'de distance en moins' },
            { v: '2x', l: 'plus rapide à planifier' },
            { v: '100%', l: 'basé sur vos données' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: C.blue }}>{s.v}</div>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────── Features ───────── */
function Features() {
  const features = [
    {
      icon: <MapIcon size={24} color="#DC2626" />, title: 'Heatmap interactive',
      desc: 'Visualisez en temps réel les zones chaudes et froides de votre entrepôt. Identifiez rapidement les racks les plus sollicités.',
      color: '#DC2626', bg: '#FEF2F2',
    },
    {
      icon: <Boxes size={24} color="#EA580C" />, title: 'Slotting ABC',
      desc: "Classifiez automatiquement vos articles (A/B/C) et obtenez un plan d'échanges optimisé pour rapprocher les produits à forte rotation.",
      color: '#EA580C', bg: '#FFF7ED',
    },
    {
      icon: <Route size={24} color="#7C3AED" />, title: 'Routing TSP',
      desc: "Calculez le trajet optimal pour chaque commande grâce à l'algorithme du voyageur de commerce. Réduisez les pas inutiles.",
      color: '#7C3AED', bg: '#F5F3FF',
    },
    {
      icon: <UploadCloud size={24} color="#16A34A" />, title: 'Import Excel / CSV',
      desc: 'Importez vos fichiers de picking en un clic. Mapping intelligent des colonnes, compatible avec tous les formats WMS.',
      color: '#16A34A', bg: '#F0FDF4',
    },
  ]

  return (
    <section id="features" style={{
      padding: '80px 40px', maxWidth: 1100, margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 50 }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: C.dark, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Des outils puissants pour votre entrepôt
        </h2>
        <p style={{ fontSize: 15, color: C.dim, maxWidth: 500, margin: '0 auto' }}>
          Chaque module analyse vos données et propose des actions concrètes pour améliorer vos opérations.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        {features.map((f, i) => (
          <div key={i} style={{
            padding: 28, borderRadius: 16, border: `1px solid ${C.divider}`,
            background: C.white, transition: 'all 0.2s',
            boxShadow: '0 1px 4px rgba(30,64,175,0.06)',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, marginBottom: 16,
              background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>{f.icon}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.dark, marginBottom: 8 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.7 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ───────── How it works ───────── */
function HowItWorks() {
  const steps = [
    { n: '1', icon: <FileText size={32} color="#1E40AF" strokeWidth={1.5} />, title: 'Demandez un compte', desc: "Remplissez le formulaire ci-dessous. Notre équipe vous contacte sous 48h." },
    { n: '2', icon: <Settings size={32} color="#1E40AF" strokeWidth={1.5} />, title: 'On configure votre espace', desc: "Nous récupérons les dimensions de votre entrepôt et créons votre compte personnalisé." },
    { n: '3', icon: <Rocket size={32} color="#1E40AF" strokeWidth={1.5} />, title: 'Commencez à optimiser', desc: "Connectez-vous, importez vos données et accédez à toutes les analyses immédiatement." },
  ]

  return (
    <section id="how" style={{
      padding: '80px 40px', background: '#F8FAFC',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: C.dark, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Comment ça marche ?
          </h2>
          <p style={{ fontSize: 15, color: C.dim }}>Un processus simple en 3 étapes</p>
        </div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center', padding: 28, borderRadius: 16,
              background: C.white, border: `1px solid ${C.divider}`,
              boxShadow: '0 2px 8px rgba(30,64,175,0.06)', position: 'relative',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', margin: '0 auto 16px',
                background: 'linear-gradient(135deg,#1E40AF,#3B82F6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800, color: '#fff',
                boxShadow: '0 2px 10px rgba(30,64,175,0.3)',
              }}>{s.n}</div>
              <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────── Form Section ───────── */
function FormSection() {
  const [form, setForm] = useState({
    company_name: '', email: '', phone: '',
    company_phone: '', website: '', message: '',
  })
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error,   setError]     = useState('')

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
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 14,
    background: '#F8FAFC', border: `1.5px solid ${C.divider}`,
    color: C.dark, fontFamily: C.font, outline: 'none', transition: 'border-color 0.15s',
  }

  if (success) {
    return (
      <section id="contact" style={{ padding: '80px 40px', background: C.white }}>
        <div style={{
          maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: 48,
          borderRadius: 20, background: '#F0FDF4', border: '2px solid #BBF7D0',
        }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <CheckCircle size={56} color={C.green} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.green, marginBottom: 12 }}>
            Demande envoyée !
          </div>
          <p style={{ fontSize: 14, color: C.dim, lineHeight: 1.8 }}>
            Nous avons bien reçu votre demande.<br/>
            Notre équipe vous contactera dans les <strong>48 heures</strong><br/>
            pour discuter de vos besoins et configurer votre compte.
          </p>
          <div style={{
            marginTop: 20, padding: '12px 20px', borderRadius: 10,
            background: C.white, border: '1px solid #BBF7D0',
            fontSize: 13, color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}>
            <Mail size={16} /> Confirmation enregistrée pour <strong>{form.email}</strong>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="contact" style={{ padding: '80px 40px', background: C.white }}>
      <div style={{ maxWidth: 580, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: C.dark, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Demander un compte
          </h2>
          <p style={{ fontSize: 15, color: C.dim }}>
            Remplissez ce formulaire et notre équipe vous contactera pour configurer votre espace.
          </p>
        </div>

        <div style={{
          padding: 36, borderRadius: 20, background: C.white,
          border: `1.5px solid ${C.divider}`, boxShadow: '0 4px 24px rgba(30,64,175,0.08)',
        }}>
          {/* Entreprise */}
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.blue,
            letterSpacing: '0.1em', marginBottom: 18, paddingBottom: 10,
            borderBottom: `1px solid ${C.divider}`, display: 'flex', alignItems: 'center', gap: 6
          }}><Building size={14} /> INFORMATIONS ENTREPRISE</div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: C.dim, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Nom de l'entreprise <span style={{ color: C.red }}>*</span>
            </label>
            <input value={form.company_name} onChange={e => set('company_name', e.target.value)}
              placeholder="Ex: Numilog Algérie" style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.blue}
              onBlur={e => e.target.style.borderColor = C.divider} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: C.dim, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Téléphone contact <span style={{ color: C.red }}>*</span>
              </label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+213 6XX XXX XXX" style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.blue}
                onBlur={e => e.target.style.borderColor = C.divider} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.dim, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Téléphone entreprise
              </label>
              <input value={form.company_phone} onChange={e => set('company_phone', e.target.value)}
                placeholder="+213 2X XXX XXXX" style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.blue}
                onBlur={e => e.target.style.borderColor = C.divider} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: C.dim, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Site web <span style={{ fontSize: 10, fontWeight: 400 }}>(optionnel)</span>
            </label>
            <input value={form.website} onChange={e => set('website', e.target.value)}
              placeholder="https://www.entreprise.dz" style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.blue}
              onBlur={e => e.target.style.borderColor = C.divider} />
          </div>

          {/* Contact */}
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.blue,
            letterSpacing: '0.1em', marginBottom: 18, paddingBottom: 10,
            borderBottom: `1px solid ${C.divider}`, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6
          }}><User size={14} /> CONTACT RESPONSABLE</div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: C.dim, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Email professionnel <span style={{ color: C.red }}>*</span>
            </label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="responsable@entreprise.dz" style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.blue}
              onBlur={e => e.target.style.borderColor = C.divider} />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: 12, color: C.dim, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Message <span style={{ fontSize: 10, fontWeight: 400 }}>(optionnel)</span>
            </label>
            <textarea value={form.message} onChange={e => set('message', e.target.value)}
              placeholder="Décrivez brièvement votre entrepôt, vos besoins..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={e => e.target.style.borderColor = C.blue}
              onBlur={e => e.target.style.borderColor = C.divider} />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 16,
              background: '#FEF2F2', border: '1px solid #FECACA',
              fontSize: 13, color: C.red,
            }}>⚠️ {error}</div>
          )}

          <button onClick={submit} disabled={loading} style={{
            width: '100%', padding: '14px', borderRadius: 10, border: 'none',
            background: loading ? '#BFDBFE' : 'linear-gradient(135deg,#1E40AF,#3B82F6)',
            color: loading ? '#93C5FD' : '#fff', fontSize: 15, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: C.font,
            transition: 'all 0.2s', boxShadow: loading ? 'none' : '0 4px 16px rgba(30,64,175,0.3)',
          }}>
            {loading ? '⏳ Envoi en cours...' : '🚀 Envoyer la demande'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: C.dimmer }}>
            Vous avez déjà un compte ?{' '}
            <a href="/login" style={{ color: C.blue, fontWeight: 600, textDecoration: 'none' }}>
              Se connecter
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ───────── Footer ───────── */
function Footer() {
  return (
    <footer style={{
      padding: '32px 40px', borderTop: `1px solid ${C.divider}`,
      background: '#F8FAFC', textAlign: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
        <img src="/assets/logo.svg" alt="OptoPick" style={{ width: 24, height: 24 }} />
        <span style={{ fontSize: 16, fontWeight: 800, color: C.dark }}>
          OPTO<span style={{ color: C.blue }}>PICK</span>
        </span>
      </div>
      <div style={{ fontSize: 12, color: C.dimmer }}>
        © {new Date().getFullYear()} OptoPick — Warehouse Intelligence Platform
      </div>

    </footer>
  )
}
