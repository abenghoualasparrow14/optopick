const BASE = import.meta.env.VITE_API_URL || '/api'
const tok  = () => localStorage.getItem('op_token')

async function req(method, path, body = null, isFile = false) {
  const headers = {}
  const token = tok()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!isFile) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: isFile ? body : body ? JSON.stringify(body) : null,
  })
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      localStorage.clear()
      window.location.href = '/login'
      return
    }
    const err = await res.json().catch(() => ({ detail: 'Erreur serveur' }))
    throw new Error(err.detail || `Erreur ${res.status}`)
  }
  return res.json()
}

export const api = {
  auth: {
    login:              (email, password) => req('POST', '/auth/login', { email, password }),
    adminCreateAccount: (data)           => req('POST', '/auth/admin/create-account', data),
    changePassword:     (data)           => req('POST', '/auth/change-password', data),
    me:                 ()               => req('GET',  '/auth/me'),
    updateAccount:      (data)           => req('PUT',  '/auth/me', data),
  },
  warehouses: {
    list:   ()     => req('GET',  '/warehouses/'),
    create: (name) => req('POST', '/warehouses/', { name }),
  },
  upload:   { file: (wid, file) => { const f = new FormData(); f.append('file', file); return req('POST', `/upload/${wid}`, f, true) } },
  heatmap:  { get: (wid) => req('GET', `/heatmap/${wid}`) },
  slotting: { get: (wid) => req('GET', `/slotting/${wid}`) },
  routing: {
    listArticles:  (wid)           => req('GET',  `/routing/${wid}/articles`),
    optimize:      (wid, articles) => req('POST', `/routing/${wid}/optimize`, { articles }),
    uploadCatalog: (wid, file)     => { const f = new FormData(); f.append('file', file); return req('POST', `/routing/${wid}/catalog/upload`, f, true) },
    catalogStatus: (wid)           => req('GET',  `/routing/${wid}/catalog/status`),
  },
}