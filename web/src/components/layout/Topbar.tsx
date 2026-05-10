import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const termo = q.trim()
    if (!termo) return
    navigate(`/chamados?q=${encodeURIComponent(termo)}`)
    setQ('')
    setSearchOpen(false)
  }

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
        {searchOpen ? (
          <form className="topbar-search-form" onSubmit={handleSearch}>
            <input
              className="topbar-search-input"
              placeholder="Buscar chamado..."
              value={q}
              onChange={e => setQ(e.target.value)}
              autoFocus
              onBlur={() => { if (!q) setSearchOpen(false) }}
            />
            <button type="submit" className="topbar-search-btn" aria-label="Buscar">⌕</button>
            <button type="button" className="topbar-search-close" onClick={() => { setQ(''); setSearchOpen(false) }} aria-label="Fechar">✕</button>
          </form>
        ) : (
          <img src={logoDark} alt="SIScom" className="topbar-logo" />
        )}
      </div>

      <div className="topbar-actions">
        {!searchOpen && (
          <button
            className="topbar-search-trigger"
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar chamado"
            title="Buscar chamado"
          >
            ⌕
          </button>
        )}
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
