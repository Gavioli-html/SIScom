import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import logoWhite from '../../SIScom White.png'
import './Sidebar.css'

interface SidebarProps {
  drawerOpen: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { icon: '⊞', label: 'Dashboard', href: '/dashboard', roles: null, areas: null },
  { icon: '≡', label: 'Chamados', href: '/chamados', roles: null, areas: null },
  { icon: '+', label: 'Novo Chamado', href: '/chamados/novo', roles: null, areas: null },
  { icon: '▦', label: 'Calendário', href: '/calendario', roles: null, areas: ['secom'] },
  { icon: '◈', label: 'Patrimônio', href: '/ativos', roles: ['tecnico', 'gestor', 'admin'], areas: ['ti'] },
  { icon: '◉', label: 'Usuários', href: '/usuarios', roles: ['gestor', 'admin'], areas: null },
  { icon: '▲', label: 'Analytics', href: '/analytics', roles: ['gestor', 'admin'], areas: null },
]

export default function Sidebar({ drawerOpen, onClose }: SidebarProps) {
  const { usuario, logout } = useAuth()

  const navVisivel = NAV_ITEMS.filter(item =>
    (!item.roles || item.roles.includes(usuario?.role ?? '')) &&
    (!item.areas || item.areas.includes(usuario?.area.slug ?? ''))
  )

  return (
    <aside className={`sidebar${drawerOpen ? ' sidebar--open' : ''}`}>
      <div className="sidebar-brand">
        <img src={logoWhite} alt="SIScom" className="sidebar-logo" />
        <button className="sidebar-close" onClick={onClose} aria-label="Fechar menu">✕</button>
      </div>

      <nav className="sidebar-nav">
        {navVisivel.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
            }
            end={item.href === '/chamados'}
          >
            <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-area-badge">
          {usuario?.area.slug.toUpperCase() ?? '—'}
        </div>
        <span className="sidebar-area-label">{usuario?.area.nome ?? ''}</span>
        <button
          className="sidebar-logout"
          onClick={logout}
          aria-label="Sair da conta"
          title="Sair"
        >
          ⏻
        </button>
      </div>
    </aside>
  )
}
