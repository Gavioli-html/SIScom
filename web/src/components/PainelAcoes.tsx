import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import './PainelAcoes.css'

interface Tecnico {
  id: number
  nome: string
  role: string
}

interface PainelAcoesProps {
  chamadoId: number
  statusAtual: string
  tecnicoAtual: { id: number; nome: string } | null
  onUpdate: () => void
}

const TRANSICOES: Record<string, { value: string; label: string }[]> = {
  ABERTO:       [{ value: 'EM_ANALISE', label: 'Iniciar Análise' }, { value: 'CANCELADO', label: 'Cancelar' }],
  EM_ANALISE:   [{ value: 'ATRIBUIDO', label: 'Marcar como Atribuído' }, { value: 'CANCELADO', label: 'Cancelar' }],
  ATRIBUIDO:    [{ value: 'EM_ANDAMENTO', label: 'Iniciar Atendimento' }, { value: 'CANCELADO', label: 'Cancelar' }],
  EM_ANDAMENTO: [{ value: 'RESOLVIDO', label: 'Marcar como Resolvido' }, { value: 'CANCELADO', label: 'Cancelar' }],
  RESOLVIDO:    [{ value: 'ENCERRADO', label: 'Encerrar' }, { value: 'EM_ANDAMENTO', label: 'Reabrir' }],
}

const STATUS_DANGER = ['CANCELADO']
const ENCERRADOS = ['ENCERRADO', 'CANCELADO']

export default function PainelAcoes({ chamadoId, statusAtual, tecnicoAtual, onUpdate }: PainelAcoesProps) {
  const { usuario } = useAuth()
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [tecnicoId, setTecnicoId] = useState<string>(tecnicoAtual?.id ? String(tecnicoAtual.id) : '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const podeAgir = ['tecnico', 'gestor', 'admin'].includes(usuario?.role ?? '')
  const encerrado = ENCERRADOS.includes(statusAtual)
  const acoes = TRANSICOES[statusAtual] ?? []

  useEffect(() => {
    if (!podeAgir) return
    api.get<{ tecnicos: Tecnico[] }>('/tecnicos').then(d => setTecnicos(d.tecnicos))
  }, [podeAgir])

  const mudarStatus = async (status: string) => {
    setErro('')
    setSalvando(true)
    try {
      await api.patch(`/chamados/${chamadoId}/status`, { status })
      onUpdate()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao alterar status')
    } finally {
      setSalvando(false)
    }
  }

  const atribuir = async () => {
    if (!tecnicoId) return
    setErro('')
    setSalvando(true)
    try {
      await api.patch(`/chamados/${chamadoId}/atribuir`, { tecnico_id: Number(tecnicoId) })
      onUpdate()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao atribuir técnico')
    } finally {
      setSalvando(false)
    }
  }

  if (!podeAgir) return null

  return (
    <div className="painel card">
      <div className="card-header">
        <span className="card-title">Ações</span>
      </div>

      {erro && <div className="alert alert-danger" style={{ fontSize: 'var(--text-xs)' }}>{erro}</div>}

      {!encerrado && acoes.length > 0 && (
        <div className="painel-section">
          <span className="painel-label">Mudar status</span>
          <div className="painel-btns">
            {acoes.map(acao => (
              <button
                key={acao.value}
                className={`btn btn-sm ${STATUS_DANGER.includes(acao.value) ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => mudarStatus(acao.value)}
                disabled={salvando}
              >
                {acao.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!encerrado && (
        <div className="painel-section">
          <span className="painel-label">Atribuir técnico</span>
          <div className="painel-atribuir">
            <select
              className="form-select"
              value={tecnicoId}
              onChange={e => setTecnicoId(e.target.value)}
              disabled={salvando}
            >
              <option value="">Selecione...</option>
              {tecnicos.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
            <button
              className="btn btn-primary btn-sm"
              onClick={atribuir}
              disabled={!tecnicoId || salvando}
            >
              Atribuir
            </button>
          </div>
        </div>
      )}

      {encerrado && (
        <p className="painel-encerrado">Este chamado está encerrado.</p>
      )}
    </div>
  )
}
