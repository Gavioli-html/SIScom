import { useState, type FormEvent } from 'react'
import AppShell from '../components/layout/AppShell'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import './Perfil.css'

const ROLE_LABEL: Record<string, string> = {
  solicitante: 'Solicitante', tecnico: 'Técnico', gestor: 'Gestor', admin: 'Admin',
}

export default function Perfil() {
  const { usuario, login } = useAuth()

  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [senhaConf, setSenhaConf] = useState('')

  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErro('')
    setSucesso('')

    if (senhaNova && senhaNova !== senhaConf) {
      setErro('A confirmação não coincide com a nova senha')
      return
    }

    const payload: Record<string, string> = {}
    if (nome.trim() && nome.trim() !== usuario?.nome) payload.nome = nome.trim()
    if (senhaNova.trim()) {
      payload.senha_atual = senhaAtual
      payload.senha_nova = senhaNova
    }

    if (Object.keys(payload).length === 0) {
      setErro('Nenhuma alteração para salvar')
      return
    }

    setSalvando(true)
    try {
      await api.patch('/perfil', payload)
      setSucesso('Perfil atualizado com sucesso!')
      setSenhaAtual('')
      setSenhaNova('')
      setSenhaConf('')
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <AppShell>
      <div className="perfil-page">
        <h1 className="page-title">Meu Perfil</h1>

        <div className="perfil-grid">
          <div className="card perfil-info">
            <div className="card-header">
              <span className="card-title">Dados da Conta</span>
            </div>
            <div className="perfil-avatar">{usuario?.nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}</div>
            <dl className="perfil-dl">
              <dt>E-mail</dt>
              <dd>{usuario?.email}</dd>
              <dt>Perfil</dt>
              <dd>{ROLE_LABEL[usuario?.role ?? ''] ?? usuario?.role}</dd>
              <dt>Área</dt>
              <dd>{usuario?.area.nome}</dd>
            </dl>
          </div>

          <form className="card perfil-form" onSubmit={handleSubmit} noValidate>
            <div className="card-header">
              <span className="card-title">Editar Perfil</span>
            </div>

            {sucesso && <div className="alert alert-success">{sucesso}</div>}
            {erro && <div className="alert alert-danger">{erro}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="p-nome">Nome</label>
              <input
                id="p-nome"
                className="form-input"
                value={nome}
                onChange={e => setNome(e.target.value)}
              />
            </div>

            <div className="perfil-divider">
              <span>Alterar senha</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="p-senha-atual">Senha atual</label>
              <input
                id="p-senha-atual"
                type="password"
                className="form-input"
                value={senhaAtual}
                onChange={e => setSenhaAtual(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="perfil-row">
              <div className="form-group">
                <label className="form-label" htmlFor="p-senha-nova">Nova senha</label>
                <input
                  id="p-senha-nova"
                  type="password"
                  className="form-input"
                  value={senhaNova}
                  onChange={e => setSenhaNova(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="p-senha-conf">Confirmar nova senha</label>
                <input
                  id="p-senha-conf"
                  type="password"
                  className={`form-input${senhaConf && senhaConf !== senhaNova ? ' err' : senhaConf && senhaConf === senhaNova ? ' ok' : ''}`}
                  value={senhaConf}
                  onChange={e => setSenhaConf(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="perfil-actions">
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
