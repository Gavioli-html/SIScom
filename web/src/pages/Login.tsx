import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import logoDark from '../SIScom Dark.png'
import './Login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await login(email, senha)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src={logoDark} alt="SIScom" className="login-logo" />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {erro && <div className="alert alert-danger" role="alert">{erro}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              E-mail institucional <span className="required">*</span>
            </label>
            <input
              id="email"
              type="email"
              className={`form-input${erro ? ' err' : ''}`}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="senha">
              Senha <span className="required">*</span>
            </label>
            <input
              id="senha"
              type="password"
              className={`form-input${erro ? ' err' : ''}`}
              value={senha}
              onChange={e => setSenha(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={carregando}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
