import './Topbar.css'

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="topbar">
      <button
        className="topbar-menu-btn"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        ☰
      </button>

      <div className="topbar-title" />

      <div className="topbar-actions">
        <div className="topbar-user">
          <div className="topbar-avatar" aria-hidden="true">A</div>
          <span className="topbar-username">Administrador</span>
        </div>
      </div>
    </header>
  )
}
