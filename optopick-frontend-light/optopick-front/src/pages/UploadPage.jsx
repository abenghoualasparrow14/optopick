import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { S } from '../components/styles'
import { Loading, ErrorBox } from '../components/Widgets'
import { CheckCircle, FolderOpen, UploadCloud, Loader2, Rocket, AlertTriangle } from 'lucide-react'

export default function UploadPage() {
  const [warehouses,  setWarehouses]  = useState([])
  const [selectedWh,  setSelectedWh]  = useState('')
  const [file,        setFile]        = useState(null)
  const [dragging,    setDragging]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState(null)
  const [error,       setError]       = useState('')

  useEffect(() => {
    api.warehouses.list().then(setWarehouses).catch(e => setError(e.message))
  }, [])

  const handleDrop = e => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  const upload = async () => {
    if (!selectedWh || !file) return
    setLoading(true); setError(''); setResult(null)
    try { const res = await api.upload.file(parseInt(selectedWh), file); setResult(res) }
    catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const labelStyle = { fontSize:9.5, color:S.dim, marginBottom:6, fontWeight:600, letterSpacing:'0.08em', display:'block' }
  const selectStyle = {
    width:'100%', padding:'12px 14px', borderRadius:10, fontSize:12,
    background:S.white, border:`1px solid rgba(0,0,0,0.06)`,
    color:S.dark, fontFamily:S.font, outline:'none', cursor:'pointer',
    transition:'border-color 0.15s',
  }

  return (
    <div style={{ maxWidth:660 }}>
      {/* Étape 1 */}
      <div style={{ marginBottom:20 }}>
        <span style={labelStyle}>ÉTAPE 1 — SÉLECTIONNER L'ENTREPÔT</span>
        <select value={selectedWh} onChange={e => setSelectedWh(e.target.value)} style={selectStyle}>
          <option value=''>-- Choisir un entrepôt --</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} (ID: {w.id})</option>)}
        </select>
      </div>

      {/* Étape 2 — Drag & drop */}
      <div style={{ marginBottom:20 }}>
        <span style={labelStyle}>ÉTAPE 2 — CHARGER LE FICHIER EXCEL / CSV</span>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput').click()}
          style={{
            padding:'48px 20px', borderRadius:16, textAlign:'center',
            border:`2px dashed ${dragging ? S.blue : file ? S.green : 'rgba(0,0,0,0.1)'}`,
            background: dragging ? '#EFF6FF' : file ? '#F0FDF4' : S.white,
            cursor:'pointer', transition:'all 0.2s', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
          }}>
          <div style={{ marginBottom:10, display:'flex', justifyContent:'center' }}>
            {file ? <CheckCircle size={36} color={S.green} /> : dragging ? <FolderOpen size={36} color={S.blue} /> : <UploadCloud size={36} color={S.dimmer} />}
          </div>
          <div style={{ fontSize:12, color: file ? S.green : S.dim, fontWeight:600, marginBottom:4 }}>
            {file ? file.name : 'Glissez votre fichier ici ou cliquez pour parcourir'}
          </div>
          <div style={{ fontSize:9.5, color:S.dimmer }}>Formats acceptés : .xlsx, .xls, .csv</div>
          <input id='fileInput' type='file' accept='.xlsx,.xls,.csv'
            style={{ display:'none' }}
            onChange={e => setFile(e.target.files[0])} />
        </div>
      </div>

      {/* Bouton */}
      <button onClick={upload} disabled={!selectedWh || !file || loading} style={{
        width:'100%', padding:'14px', borderRadius:12, border:'none',
        background: (!selectedWh||!file||loading) ? '#E2E8F0' : 'linear-gradient(135deg,#1E40AF,#3B82F6)',
        color: (!selectedWh||!file||loading) ? '#94A3B8' : S.white,
        fontSize:14, fontWeight:700,
        cursor: (!selectedWh||!file||loading) ? 'not-allowed' : 'pointer',
        fontFamily:S.font, marginBottom:20, transition:'all 0.2s',
        boxShadow: (!selectedWh||!file||loading) ? 'none' : '0 6px 16px rgba(30,64,175,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
      }}>
        {loading ? <><Loader2 size={16} /> Import en cours...</> : <><Rocket size={16} /> Importer les données</>}
      </button>

      {error && <ErrorBox message={error} />}

      {/* Résultat */}
      {result && (
        <div style={{
          padding:24, borderRadius:16,
          background:'#F0FDF4', border:'1px solid rgba(22,163,74,0.15)',
          boxShadow:'0 4px 12px rgba(22,163,74,0.05)',
        }}>
          <div style={{ fontSize:13, fontWeight:700, color:S.green, marginBottom:16, display:'flex', alignItems:'center', gap:6 }}>
            <CheckCircle size={16} /> Import réussi !
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            {[
              { l:'Lignes importées',   v: result.rows_imported },
              { l:'Articles distincts', v: result.articles_found },
              { l:'Racks détectés',     v: result.racks_found?.length },
              { l:'Période',            v: result.date_range?.from ? `${result.date_range.from} → ${result.date_range.to}` : '—' },
            ].map((s,i) => (
              <div key={i} style={{
                padding:'14px 16px', borderRadius:12,
                background:S.white, border:'1px solid rgba(22,163,74,0.15)',
                boxShadow:'0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <div style={{ fontSize:18, fontWeight:700, color:'#16A34A' }}>{s.v}</div>
                <div style={{ fontSize:10, color:S.dim, marginTop:2, fontWeight:500 }}>{s.l}</div>
              </div>
            ))}
          </div>
          {result.warnings?.length > 0 && (
            <div style={{ padding:'9px 13px', borderRadius:8, background:'#FFFBEB', border:'1px solid #FDE68A' }}>
              <div style={{ fontSize:9.5, color:'#92400E', fontWeight:600, marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
                <AlertTriangle size={12} /> Avertissements
              </div>
              {result.warnings.map((w,i) => <div key={i} style={{ fontSize:9, color:'#78350F' }}>{w}</div>)}
            </div>
          )}
          <div style={{ marginTop:12, fontSize:9, color:S.dim }}>
            Racks détectés : {result.racks_found?.join(' · ')}
          </div>
        </div>
      )}
    </div>
  )
}