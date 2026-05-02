import './Sidebar.css'

interface SidebarProps {
  drawerOpen: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { icon: '⊞', label: 'Dashboard', href: '/dashboard' },
  { icon: '≡', label: 'Chamados', href: '/chamados' },
  { icon: '+', label: 'Novo Chamado', href: '/chamados/novo' },
]

export default function Sidebar({ drawerOpen, onClose }: SidebarProps) {
  const current = window.location.pathname

  return (
    <aside className={`sidebar${drawerOpen ? ' sidebar--open' : ''}`}>
      <div className="sidebar-brand">
        <span className="sidebar-logo">SIS<strong>com</strong></span>
        <button className="sidebar-close" onClick={onClose} aria-label="Fechar menu">✕</button>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`sidebar-item${current === item.href ? ' sidebar-item--active' : ''}`}
          >
            <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-area-badge">TI</div>
        <span className="sidebar-area-label">Tecnologia da Informação</span>
      </div>
    </aside>
  )
}
