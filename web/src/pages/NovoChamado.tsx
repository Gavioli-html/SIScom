import { useEffect, useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import './NovoChamado.css'

interface Campo {
  chave: string
  label: string
  tipo: 'text' | 'textarea' | 'select'
  obrigatorio?: boolean
  opcoes?: string[]
}

interface Template {
  id: number
  nome: string
  area_id: number
  campos_json: Campo[]
  sla_config_json: unknown
}

const PRIORIDADES = ['normal', 'baixa', 'media', 'alta', 'critica']

const SECRETARIAS = [
  'Secretaria Municipal de Governo',
  'Secretaria Municipal de Negócios Jurídicos',
  'Secretaria Municipal de Administração e Recursos Humanos',
  'Secretaria Municipal de Finanças e Planejamento Orçamentário',
  'Secretaria Municipal de Agropecuária',
  'Secretaria Municipal de Comunicação',
  'Secretaria Municipal de Desenvolvimento Social',
  'Secretaria Municipal de Educação e Cultura',
  'Secretaria Municipal de Esporte e Lazer',
  'Secretaria Municipal de Habitação',
  'Secretaria Municipal de Indústria e Comércio',
  'Secretaria Municipal de Infraestrutura e Logística',
  'Secretaria Municipal de Meio Ambiente',
  'Secretaria Municipal de Saúde',
  'Secretaria Municipal de Segurança Pública, Trânsito e Defesa Civil',
  'Secretaria Municipal de Turismo',
]

export default function NovoChamado() {
  const { usuario } = useAuth()
  const navigate = useNavigate()

  const [template, setTemplate] = useState<Template | null>(null)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState('normal')
  const [secretaria, setSecretaria] = useState('')
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!usuario) return
    api.get<{ templates: Template[] }>(`/templates?area_id=${usuario.area.id}`)
      .then(data => {
        if (data.templates[0]) setTemplate(data.templates[0])
      })
  }, [usuario])

  const setCampo = (chave: string, valor: string) =>
    setCampos(prev => ({ ...prev, [chave]: valor }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!template) return
    setErro('')
    setEnviando(true)

    const camposArr = Object.entries(campos)
      .filter(([, v]) => v.trim())
      .map(([chave, valor]) => ({ chave, valor }))

    const formato = campos['formato'] ?? undefined

    try {
      const data = await api.post<{ chamado: { id: number; protocolo: string } }>(
        '/chamados',
        { titulo, descricao, template_id: template.id, prioridade, secretaria_solicitante: secretaria || undefined, campos: camposArr, formato }
      )
      navigate(`/chamados/${data.chamado.id}`)
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao abrir chamado')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AppShell>
      <div className="novo-page">
        <div className="novo-header">
          <h1 className="page-title">Novo Chamado</h1>
          {template && (
            <span className="badge badge-neutral">{template.nome}</span>
          )}
        </div>

        {usuario?.area.slug === 'ti' && (
          <div className="alert alert-info novo-disclaimer">
            <strong>💡 Acesso Remoto</strong> — Boa parte dos problemas podem ser resolvidos via acesso remoto,
            sem a necessidade de um técnico ir até sua localização.
            <br /><br />
            Para nos passar seu acesso: clique na <strong>flechinha perto do horário</strong> (canto inferior direito
            da tela), identifique um ícone com um <strong>"V"</strong> e passe o mouse por cima <em>sem clicar</em> —
            o número que aparecer é o seu <strong>ID de Acesso Remoto</strong>. Com ele conseguimos acessar
            sua máquina em instantes!
          </div>
        )}

        <form className="novo-form card" onSubmit={handleSubmit} noValidate>
          {erro && <div className="alert alert-danger">{erro}</div>}

          <div className="novo-grid">
            <div className="form-group novo-titulo">
              <label className="form-label" htmlFor="titulo">
                Título <span className="required">*</span>
              </label>
              <input
                id="titulo"
                className="form-input"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="secretaria">
                Secretaria Solicitante <span className="required">*</span>
              </label>
              <select
                id="secretaria"
                className="form-select"
                value={secretaria}
                onChange={e => setSecretaria(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {SECRETARIAS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="prioridade">Prioridade</label>
              <select
                id="prioridade"
                className="form-select"
                value={prioridade}
                onChange={e => setPrioridade(e.target.value)}
              >
                {PRIORIDADES.map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="form-group novo-desc">
              <label className="form-label" htmlFor="descricao">
                Descrição <span className="required">*</span>
              </label>
              <textarea
                id="descricao"
                className="form-textarea"
                rows={4}
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                required
              />
            </div>

            {template?.campos_json.map((campo) => (
              <div key={campo.chave} className="form-group">
                <label className="form-label" htmlFor={campo.chave}>
                  {campo.label}
                  {campo.obrigatorio && <span className="required"> *</span>}
                </label>
                {campo.tipo === 'select' ? (
                  <select
                    id={campo.chave}
                    className="form-select"
                    value={campos[campo.chave] ?? ''}
                    onChange={e => setCampo(campo.chave, e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {campo.opcoes?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : campo.tipo === 'textarea' ? (
                  <textarea
                    id={campo.chave}
                    className="form-textarea"
                    rows={3}
                    value={campos[campo.chave] ?? ''}
                    onChange={e => setCampo(campo.chave, e.target.value)}
                  />
                ) : (
                  <input
                    id={campo.chave}
                    type="text"
                    className="form-input"
                    value={campos[campo.chave] ?? ''}
                    onChange={e => setCampo(campo.chave, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="novo-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={enviando || !titulo || !descricao || !secretaria}>
              {enviando ? 'Abrindo...' : 'Abrir Chamado'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
