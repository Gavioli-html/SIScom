import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: string[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { usuario, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--mono)',
        color: 'var(--ink-soft)',
        fontSize: 'var(--text-sm)',
      }}>
        Carregando...
      </div>
    )
  }

  if (!usuario) return <Navigate to="/login" replace />

  if (roles && !roles.includes(usuario.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
