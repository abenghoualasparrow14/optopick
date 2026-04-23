import { createContext, useContext, useState } from 'react'
import { jwtDecode } from 'jwt-decode'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [token,   setToken]   = useState(() => localStorage.getItem('op_token'))
  const [company, setCompany] = useState(() => {
    try { return JSON.parse(localStorage.getItem('op_company')) } catch { return null }
  })

  const login = (t, c) => {
    // Decode JWT to extract is_admin flag
    try {
      const payload = jwtDecode(t)
      c = { ...c, is_admin: !!payload.is_admin, name: payload.name || c?.name }
    } catch { /* ignore decode errors */ }
    localStorage.setItem('op_token', t)
    localStorage.setItem('op_company', JSON.stringify(c))
    setToken(t); setCompany(c)
  }

  const logout = () => {
    localStorage.removeItem('op_token')
    localStorage.removeItem('op_company')
    setToken(null); setCompany(null)
  }

  const isAdmin = !!company?.is_admin

  return (
    <Ctx.Provider value={{ token, company, login, logout, isAuth: !!token, isAdmin }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)