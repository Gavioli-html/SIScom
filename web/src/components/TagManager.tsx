import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import './TagManager.css'

interface Tag {
  id: number
  slug: string
  label: string
  cor: string
}

interface TagManagerProps {
  chamadoId: number
  tagsAtuais: Tag[]
  encerrado: boolean
  onUpdate: () => void
}

const CORES_PRESET = [
  '#0066cc', '#4a6741', '#7a5c1e', '#6b2233',
  '#5262c4', '#1e3f6b', '#2b6b5c', '#6b4a2b',
]

export default function TagManager({ chamadoId, tagsAtuais, encerrado, onUpdate }: TagManagerProps) {
  const { usuario } = useAuth()
  const [todasTags, setTodasTags] = useState<Tag[]>([])
  const [criando, setCriando] = useState(false)
  const [novaLabel, setNovaLabel] = useState('')
  const [novaCor, setNovaCor] = useState(CORES_PRESET[0])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const podeEditar = ['tecnico', 'gestor', 'admin'].includes(usuario?.role ?? '')
  const podeCriar = ['gestor', 'admin'].includes(usuario?.role ?? '')

  useEffect(() => {
    api.get<{ tags: Tag[] }>('/tags').then(d => setTodasTags(d.tags))
  }, [])

  const tagsIds = new Set(tagsAtuais.map(t => t.id))

  const adicionarTag = async (tag_id: number) => {
    setSalvando(true)
    setErro('')
    try {
      await api.post(`/chamados/${chamadoId}/tags`, { tag_id })
      onUpdate()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao adicionar tag')
    } finally {
      setSalvando(false)
    }
  }

  const removerTag = async (tag_id: number) => {
    setSalvando(true)
    setErro('')
    try {
      await api.delete(`/chamados/${chamadoId}/tags/${tag_id}`)
      onUpdate()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao remover tag')
    } finally {
      setSalvando(false)
    }
  }

  const criarTag = async () => {
    if (!novaLabel.trim()) return
    setSalvando(true)
    setErro('')
    try {
      const data = await api.post<{ tag: Tag }>('/tags', { label: novaLabel.trim(), cor: novaCor })
      setTodasTags(prev => [...prev, data.tag].sort((a, b) => a.label.localeCompare(b.label)))
      setNovaLabel('')
      setCriando(false)
      await adicionarTag(data.tag.id)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar tag')
      setSalvando(false)
    }
  }

  return (
    <div className="tag-manager card">
      <div className="card-header">
        <span className="card-title">Tags</span>
        {podeCriar && !encerrado && (
          <button className="tag-manager-criar" onClick={() => setCriando(v => !v)}>
            {criando ? '✕' : '+ Nova'}
          </button>
        )}
      </div>

      {erro && <div className="alert alert-danger" style={{ fontSize: 'var(--text-xs)' }}>{erro}</div>}

      {/* Tags já aplicadas */}
      <div className="tag-manager-atuais">
        {tagsAtuais.length === 0 && (
          <span className="tag-manager-vazio">Nenhuma tag</span>
        )}
        {tagsAtuais.map(tag => (
          <span
            key={tag.id}
            className="tag-global"
            style={{ '--tag-cor': tag.cor } as React.CSSProperties}
          >
            #{tag.label}
            {podeEditar && !encerrado && (
              <button
                className="tag-global-remove"
                onClick={() => removerTag(tag.id)}
                disabled={salvando}
                title="Remover tag"
              >×</button>
            )}
          </span>
        ))}
      </div>

      {/* Formulário de nova tag */}
      {criando && (
        <div className="tag-manager-form">
          <input
            className="form-input"
            placeholder="Nome da tag..."
            value={novaLabel}
            onChange={e => setNovaLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && criarTag()}
          />
          <div className="tag-manager-cores">
            {CORES_PRESET.map(cor => (
              <button
                key={cor}
                className={`tag-cor-btn${novaCor === cor ? ' ativo' : ''}`}
                style={{ background: cor }}
                onClick={() => setNovaCor(cor)}
              />
            ))}
          </div>
          <button className="btn btn-primary btn-sm" onClick={criarTag} disabled={salvando || !novaLabel.trim()}>
            Criar e aplicar
          </button>
        </div>
      )}

      {/* Tags disponíveis para adicionar */}
      {podeEditar && !encerrado && !criando && (
        <div className="tag-manager-disponiveis">
          {todasTags.filter(t => !tagsIds.has(t.id)).map(tag => (
            <button
              key={tag.id}
              className="tag-global tag-global-add"
              style={{ '--tag-cor': tag.cor } as React.CSSProperties}
              onClick={() => adicionarTag(tag.id)}
              disabled={salvando}
            >
              + #{tag.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
