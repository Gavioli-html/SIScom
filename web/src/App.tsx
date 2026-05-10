import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './router/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Chamados from './pages/Chamados'
import Chamado from './pages/Chamado'
import NovoChamado from './pages/NovoChamado'
import Usuarios from './pages/Usuarios'
import Perfil from './pages/Perfil'
import Analytics from './pages/Analytics'
import Calendario from './pages/Calendario'
import Ativos from './pages/Ativos'
import Ativo from './pages/Ativo'
import DesignSystem from './pages/DesignSystem'
import AppShell from './components/layout/AppShell'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/ds" element={<AppShell><DesignSystem /></AppShell>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/chamados" element={<ProtectedRoute><Chamados /></ProtectedRoute>} />
          <Route path="/chamados/novo" element={<ProtectedRoute><NovoChamado /></ProtectedRoute>} />
          <Route path="/chamados/:id" element={<ProtectedRoute><Chamado /></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/calendario" element={<ProtectedRoute><Calendario /></ProtectedRoute>} />
          <Route path="/ativos" element={<ProtectedRoute><Ativos /></ProtectedRoute>} />
          <Route path="/ativos/:id" element={<ProtectedRoute><Ativo /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
