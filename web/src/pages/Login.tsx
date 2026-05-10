import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import logoWhite from '../SIScom White.png'
import './Login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [senhaVisivel, setSenhaVisivel] = useState(false)

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await login(email, senha)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Credenciais inválidas')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="login-page">

      {/* Painel esquerdo — branding */}
      <div className="login-panel-left" aria-hidden="true">
        <div className="login-left-content">
          <img src={logoWhite} alt="SIScom" className="login-logo-left" />
          <div className="login-left-divider" />
          <p className="login-left-desc">Sistema Oficial de Comunicação Interna de Jaguariaíva</p>
          <p className="login-left-city">Prefeitura Municipal de Jaguariaíva · PR</p>
        </div>
        <div className="login-left-badge">Plataforma interna · Acesso restrito</div>
        <div className="login-left-grid" aria-hidden="true" />
      </div>

      {/* Painel direito — formulário */}
      <div className="login-panel-right">
        <div className="login-form-wrap">

          <div className="login-form-header">
            <h1 className="login-title">Acesse sua conta</h1>
            <p className="login-subtitle">Use seu e-mail institucional e senha</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="login-form">
            {erro && (
              <div className="alert alert-danger login-erro" role="alert">
                <span className="login-erro-icon">!</span>
                {erro}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">E-mail institucional</label>
              <div className="login-input-wrap">
                <span className="login-input-icon" aria-hidden="true">@</span>
                <input
                  id="email"
                  type="email"
                  className={`form-input login-input${erro ? ' err' : ''}`}
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErro('') }}
                  autoComplete="email"
                  placeholder="nome@jaguariaiva.pr.gov.br"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="senha">Senha</label>
              <div className="login-input-wrap">
                <span className="login-input-icon" aria-hidden="true">⚿</span>
                <input
                  id="senha"
                  type={senhaVisivel ? 'text' : 'password'}
                  className={`form-input login-input login-input--senha${erro ? ' err' : ''}`}
                  value={senha}
                  onChange={e => { setSenha(e.target.value); setErro('') }}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="login-toggle-senha"
                  onClick={() => setSenhaVisivel(v => !v)}
                  aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
                  tabIndex={-1}
                >
                  {senhaVisivel ? '○' : '●'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={carregando || !email || !senha}
            >
              {carregando ? (
                <span className="login-btn-loading">
                  <span className="login-spinner" />
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>

          <footer className="login-footer">
            © {new Date().getFullYear()} Prefeitura Municipal de Jaguariaíva
          </footer>
        </div>
      </div>
    </div>
  )
}
