import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import logoDark from '../../SIScom Dark.png'
import './Topbar.css'

interface TopbarProps {
  onMenuClick: () => void
}

function iniciais(nome: string) {
  return nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { usuario } = useAuth()

  return (
    <header className="topbar">
      <button
        className="topbar-menu-btn"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        ☰
      </button>

      <div className="topbar-title">
        <img src={logoDark} alt="SIScom" className="topbar-logo" />
      </div>

      <div className="topbar-actions">
        <Link to="/perfil" className="topbar-user">
          <div className="topbar-avatar" aria-hidden="true">
            {usuario ? iniciais(usuario.nome) : '—'}
          </div>
          <span className="topbar-username">{usuario?.nome ?? ''}</span>
        </Link>
      </div>
    </header>
  )
}
