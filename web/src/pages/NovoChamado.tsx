import { useEffect, useState, useRef } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import './NovoChamado.css'

interface AtivoPreview {
  id: number
  patrimonio: string
  tipo: string
  descricao: string | null
  marca: string | null
  modelo: string | null
  localizacao: string | null
  ip: string | null
  status: string
}

interface Campo {
  chave: string
  label: string
  tipo: 'text' | 'textarea' | 'select' | 'multiselect'
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
  const [ativoPreview, setAtivoPreview] = useState<AtivoPreview | null>(null)
  const [ativoBuscando, setAtivoBuscando] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!usuario) return
    api.get<{ templates: Template[] }>(`/templates?area_id=${usuario.area.id}`)
      .then(data => {
        if (data.templates[0]) {
          setTemplate(data.templates[0])
        } else {
          setErro('Nenhum template encontrado para sua área. Contate o administrador.')
        }
      })
      .catch(() => setErro('Erro ao carregar template. Recarregue a página.'))
  }, [usuario])

  const setCampo = (chave: string, valor: string) => {
    setCampos(prev => ({ ...prev, [chave]: valor }))
    if (chave === 'patrimonio' && usuario?.area.slug === 'ti') {
      setAtivoPreview(null)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (!valor.trim()) { setAtivoBuscando(false); return }
      setAtivoBuscando(true)
      debounceRef.current = setTimeout(() => {
        api.get<{ ativo: AtivoPreview | null }>(`/ativos?patrimonio=${encodeURIComponent(valor.trim())}`)
          .then(d => setAtivoPreview(d.ativo))
          .catch(() => setAtivoPreview(null))
          .finally(() => setAtivoBuscando(false))
      }, 500)
    }
  }

  const toggleMulti = (chave: string, opcao: string) => {
    setCampos(prev => {
      const atual = prev[chave] ? prev[chave].split(',').filter(Boolean) : []
      const novo = atual.includes(opcao)
        ? atual.filter(o => o !== opcao)
        : [...atual, opcao]
      return { ...prev, [chave]: novo.join(',') }
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    console.log('[NovoChamado] submit disparado')
    console.log('[NovoChamado] template:', template)
    console.log('[NovoChamado] titulo:', titulo, '| descricao:', descricao, '| secretaria:', secretaria)

    if (!template) { setErro('Template não carregado. Recarregue a página.'); return }
    if (!titulo.trim()) { setErro('O título é obrigatório.'); return }
    if (!descricao.trim()) { setErro('A descrição é obrigatória.'); return }
    if (!secretaria) { setErro('Selecione a Secretaria Solicitante.'); return }
    setErro('')
    setEnviando(true)
    console.log('[NovoChamado] passou validações, chamando API...')

    const camposArr = Object.entries(campos)
      .filter(([, v]) => v.trim())
      .map(([chave, valor]) => ({ chave, valor }))

    const formato = campos['formato'] ?? undefined

    try {
      const data = await api.post<{ chamado: { id: number; protocolo: string } }>(
        '/chamados',
        { titulo, descricao, template_id: template.id, prioridade, secretaria_solicitante: secretaria || undefined, campos: camposArr, formato }
      )
      console.log('[NovoChamado] chamado criado:', data.chamado)
      if (ativoPreview) {
        await api.post(`/chamados/${data.chamado.id}/ativos`, { ativo_id: ativoPreview.id }).catch(() => null)
      }
      navigate(`/chamados/${data.chamado.id}`)
    } catch (err: unknown) {
      console.error('[NovoChamado] erro:', err)
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

        {erro && <div className="alert alert-danger" style={{ position: 'sticky', top: 0, zIndex: 50 }}>{erro}</div>}

        <form className="novo-form card" onSubmit={handleSubmit} noValidate>

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
              <div key={campo.chave} className={`form-group${campo.tipo === 'multiselect' ? ' novo-full' : ''}`}>
                <label className="form-label" htmlFor={campo.chave}>
                  {campo.label}
                  {campo.obrigatorio && <span className="required"> *</span>}
                </label>
                {campo.tipo === 'multiselect' ? (
                  <div className="form-chips" role="group" aria-label={campo.label}>
                    {campo.opcoes?.map(opcao => {
                      const selecionados = campos[campo.chave]?.split(',').filter(Boolean) ?? []
                      const ativo = selecionados.includes(opcao)
                      return (
                        <button
                          key={opcao}
                          type="button"
                          className={`form-chip${ativo ? ' form-chip--ativo' : ''}`}
                          onClick={() => toggleMulti(campo.chave, opcao)}
                          aria-pressed={ativo}
                        >
                          {ativo && <span className="form-chip-check" aria-hidden="true">✓</span>}
                          {opcao}
                        </button>
                      )
                    })}
                  </div>
                ) : campo.tipo === 'select' ? (
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
                  <>
                    <input
                      id={campo.chave}
                      type="text"
                      className="form-input"
                      value={campos[campo.chave] ?? ''}
                      onChange={e => setCampo(campo.chave, e.target.value)}
                    />
                    {campo.chave === 'patrimonio' && usuario?.area.slug === 'ti' && (
                      ativoBuscando ? (
                        <p className="novo-ativo-hint">Buscando ativo...</p>
                      ) : ativoPreview ? (
                        <div className="novo-ativo-card">
                          <div className="novo-ativo-card-header">
                            <span className="novo-ativo-badge">✓ Ativo encontrado</span>
                          </div>
                          <dl className="novo-ativo-specs">
                            <dt>Tipo</dt><dd>{ativoPreview.tipo}</dd>
                            {ativoPreview.descricao && (<><dt>Descrição</dt><dd>{ativoPreview.descricao}</dd></>)}
                            {ativoPreview.marca && (<><dt>Marca/Modelo</dt><dd>{ativoPreview.marca}{ativoPreview.modelo ? ` ${ativoPreview.modelo}` : ''}</dd></>)}
                            {ativoPreview.localizacao && (<><dt>Localização</dt><dd>{ativoPreview.localizacao}</dd></>)}
                            {ativoPreview.ip && (<><dt>IP</dt><dd>{ativoPreview.ip}</dd></>)}
                          </dl>
                        </div>
                      ) : campos['patrimonio']?.trim() ? (
                        <p className="novo-ativo-hint novo-ativo-hint--miss">Patrimônio não encontrado no inventário.</p>
                      ) : null
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="novo-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={enviando}>
              {enviando ? 'Abrindo...' : 'Abrir Chamado'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
