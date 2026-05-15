const BASE        = import.meta.env.VITE_API_URL || '/api'
const tok         = () => localStorage.getItem('op_token')
const refreshTok  = () => localStorage.getItem('op_refresh_token')

// ── Renouvellement automatique du access_token ────────────────────────────────
let _refreshing = false
let _refreshQueue = []

async function _doRefresh() {
  const rt = refreshTok()
  if (!rt) throw new Error('no_refresh')
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rt }),
  })
  if (!res.ok) throw new Error('refresh_failed')
  const data = await res.json()
  localStorage.setItem('op_token', data.access_token)
  if (data.refresh_token) localStorage.setItem('op_refresh_token', data.refresh_token)
  return data.access_token
}

async function _refreshOnce() {
  if (_refreshing) {
    return new Promise((resolve, reject) => _refreshQueue.push({ resolve, reject }))
  }
  _refreshing = true
  try {
    const token = await _doRefresh()
    _refreshQueue.forEach(p => p.resolve(token))
    return token
  } catch (e) {
    _refreshQueue.forEach(p => p.reject(e))
    throw e
  } finally {
    _refreshing = false
    _refreshQueue = []
  }
}
// ─────────────────────────────────────────────────────────────────────────────

async function req(method, path, body = null, isFile = false) {
  const doRequest = async (accessToken) => {
    const headers = {}
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
    if (!isFile) headers['Content-Type'] = 'application/json'
    return fetch(`${BASE}${path}`, {
      method, headers,
      body: isFile ? body : body ? JSON.stringify(body) : null,
    })
  }

  let res = await doRequest(tok())

  // Token expiré → on tente un refresh silencieux
  if (res.status === 401) {
    try {
      const newToken = await _refreshOnce()
      res = await doRequest(newToken)
    } catch {
      localStorage.clear()
      window.location.href = '/login'
      return
    }
  }

  if (!res.ok) {
    if (res.status === 403) {
      localStorage.clear()
      window.location.href = '/login'
      return
    }
    if (res.status === 429) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Trop de tentatives. Veuillez patienter.')
    }
    const err = await res.json().catch(() => ({ detail: 'Erreur serveur' }))
    throw new Error(err.detail || `Erreur ${res.status}`)
  }
  return res.json()
}

export const api = {
  auth: {
    login: async (email, password) => {
      const data = await req('POST', '/auth/login', { email, password })
      if (data?.access_token)  localStorage.setItem('op_token', data.access_token)
      if (data?.refresh_token) localStorage.setItem('op_refresh_token', data.refresh_token)
      return data
    },
    adminCreateAccount: (data)  => req('POST', '/auth/admin/create-account', data),
    changePassword:     (data)  => req('POST', '/auth/change-password', data),
    me:                 ()      => req('GET',  '/auth/me'),
    updateAccount:      (data)  => req('PUT',  '/auth/me', data),
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
  adminCompanies: {
    list:             ()                         => req('GET',   '/admin/companies/'),
    get:              (id)                        => req('GET',   `/admin/companies/${id}`),
    update:           (id, data)                 => req('PATCH', `/admin/companies/${id}`, data),
    resetPassword:    (id)                        => req('POST',  `/admin/companies/${id}/reset-password`),
    updateWarehouse:  (cid, wid, data)           => req('PATCH', `/admin/companies/${cid}/warehouses/${wid}`, data),
  },
}