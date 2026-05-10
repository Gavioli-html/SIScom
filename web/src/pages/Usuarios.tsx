import { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import './Usuarios.css'

interface Area { id: number; nome: string; slug: string }
interface Usuario {
  id: number
  nome: string
  email: string
  role: string
  ativo: boolean
  area: Area
}

const ROLES = ['solicitante', 'tecnico', 'gestor', 'admin']

const ROLE_LABEL: Record<string, string> = {
  solicitante: 'Solicitante', tecnico: 'Técnico', gestor: 'Gestor', admin: 'Admin',
}

const ROLE_BADGE: Record<string, string> = {
  solicitante: 'badge-neutral', tecnico: 'badge-primary',
  gestor: 'badge-warning', admin: 'badge-danger',
}

interface FormState {
  nome: string; email: string; senha: string; role: string
}

const FORM_VAZIO: FormState = { nome: '', email: '', senha: '', role: 'solicitante' }

export default function Usuarios() {
  const { usuario: eu } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'criar' | 'editar' | null>(null)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [form, setForm] = useState<FormState>(FORM_VAZIO)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const isAdmin = eu?.role === 'admin'

  const carregar = () =>
    api.get<{ usuarios: Usuario[] }>('/usuarios')
      .then(d => setUsuarios(d.usuarios))
      .finally(() => setLoading(false))

  useEffect(() => { carregar() }, [])

  const abrirCriar = () => {
    setForm(FORM_VAZIO)
    setEditando(null)
    setErro('')
    setModal('criar')
  }

  const abrirEditar = (u: Usuario) => {
    setForm({ nome: u.nome, email: u.email, senha: '', role: u.role })
    setEditando(u)
    setErro('')
    setModal('editar')
  }

  const fecharModal = () => { setModal(null); setEditando(null); setErro('') }

  const set = (campo: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [campo]: e.target.value }))

  const salvar = async () => {
    setErro('')
    setSalvando(true)
    try {
      if (modal === 'criar') {
        await api.post('/usuarios', { ...form })
      } else if (editando) {
        const payload: Record<string, unknown> = {
          nome: form.nome, email: form.email, role: form.role,
        }
        if (form.senha.trim()) payload.senha = form.senha
        await api.patch(`/usuarios/${editando.id}`, payload)
      }
      await carregar()
      fecharModal()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const toggleAtivo = async (u: Usuario) => {
    try {
      await api.patch(`/usuarios/${u.id}/ativo`, { ativo: !u.ativo })
      await carregar()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao alterar status')
    }
  }

  const remover = async (u: Usuario) => {
    if (!confirm(`Excluir permanentemente "${u.nome}"?\n\nEsta ação não pode ser desfeita.`)) return
    try {
      await api.delete(`/usuarios/${u.id}`)
      await carregar()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao excluir usuário')
    }
  }

  return (
    <AppShell>
      <div className="usr-page">
        <div className="usr-header">
          <h1 className="page-title">Usuários</h1>
          {isAdmin && (
            <button className="btn btn-primary" onClick={abrirCriar}>+ Novo Usuário</button>
          )}
        </div>

        <div className="card">
          {loading ? (
            <p className="usr-loading">Carregando...</p>
          ) : usuarios.length === 0 ? (
            <p className="usr-empty">Nenhum usuário encontrado.</p>
          ) : (
            <div className="usr-table-wrap">
            <table className="usr-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Área</th>
                  <th>Status</th>
                  {isAdmin && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} className={!u.ativo ? 'usr-inativo' : ''}>
                    <td className="usr-nome">{u.nome}</td>
                    <td className="usr-email">{u.email}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[u.role] ?? 'badge-neutral'}`}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="usr-area">{u.area.nome}</td>
                    <td>
                      <span className={`badge ${u.ativo ? 'badge-success' : 'badge-neutral'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="usr-acoes">
                        <button className="btn btn-secondary btn-sm" onClick={() => abrirEditar(u)}>
                          Editar
                        </button>
                        {u.id !== eu?.id && (
                          <button
                            className={`btn btn-sm ${u.ativo ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => toggleAtivo(u)}
                          >
                            {u.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                        )}
                        {u.id !== eu?.id && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => remover(u)}
                            title="Excluir permanentemente"
                          >
                            Excluir
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="usr-modal-overlay" onClick={fecharModal}>
          <div className="usr-modal card" onClick={e => e.stopPropagation()}>
            <div className="card-header">
              <span className="card-title">{modal === 'criar' ? 'Novo Usuário' : 'Editar Usuário'}</span>
              <button className="usr-modal-close" onClick={fecharModal} aria-label="Fechar">✕</button>
            </div>

            {erro && <div className="alert alert-danger">{erro}</div>}

            <div className="usr-form">
              <div className="form-group">
                <label className="form-label" htmlFor="u-nome">Nome <span className="required">*</span></label>
                <input id="u-nome" className="form-input" value={form.nome} onChange={set('nome')} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="u-email">E-mail <span className="required">*</span></label>
                <input id="u-email" type="email" className="form-input" value={form.email} onChange={set('email')} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="u-senha">
                  Senha {modal === 'editar' && <span className="form-hint">(deixe em branco para manter)</span>}
                  {modal === 'criar' && <span className="required"> *</span>}
                </label>
                <input id="u-senha" type="password" className="form-input" value={form.senha} onChange={set('senha')} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="u-role">Perfil <span className="required">*</span></label>
                <select id="u-role" className="form-select" value={form.role} onChange={set('role')}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </div>
            </div>

            <div className="usr-modal-actions">
              <button className="btn btn-secondary" onClick={fecharModal} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
