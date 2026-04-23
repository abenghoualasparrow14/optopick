import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LandingPage         from './pages/LandingPage'
import LoginPage           from './pages/LoginPage'
import DashboardPage       from './pages/DashboardPage'
import SettingsPage        from './pages/SettingsPage'
import UploadPage          from './pages/UploadPage'
import HeatmapPage         from './pages/HeatmapPage'
import SlottingPage        from './pages/SlottingPage'
import RoutingPage         from './pages/RoutingPage'
import AdminPage           from './pages/AdminPage'

function PrivateRoute({ children }) {
  const { isAuth } = useAuth()
  return isAuth
    ? <Layout>{children}</Layout>
    : <Navigate to='/login' replace />
}

function AdminRoute({ children }) {
  const { isAuth, isAdmin } = useAuth()
  if (!isAuth) return <Navigate to='/login' replace />
  if (!isAdmin) return <Navigate to='/dashboard' replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <Routes>
      {/* Routes publiques */}
      <Route path='/'      element={<LandingPage />} />
      <Route path='/login' element={<LoginPage />} />

      {/* Routes privées */}
      <Route path='/dashboard' element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path='/settings'  element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      <Route path='/upload'    element={<PrivateRoute><UploadPage /></PrivateRoute>} />
      <Route path='/heatmap'   element={<PrivateRoute><HeatmapPage /></PrivateRoute>} />
      <Route path='/slotting'  element={<PrivateRoute><SlottingPage /></PrivateRoute>} />
      <Route path='/routing'   element={<PrivateRoute><RoutingPage /></PrivateRoute>} />

      {/* Route admin uniquement */}
      <Route path='/admin' element={<AdminRoute><AdminPage /></AdminRoute>} />

      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  )
}