import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import SlaCountdown from '../components/SlaCountdown'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import './Dashboard.css'

interface Urgente {
  id: number
  protocolo: string
  titulo: string
  status: string
  prioridade: string
  sla_prazo: string | null
  area: { nome: string }
  tecnicos: { tecnico: { nome: string } }[]
}

interface Metricas {
  abertos: number
  em_andamento: number
  resolvidos_mes: number
  vencidos: number
}

interface DashboardData {
  metricas: Metricas
  urgentes: Urgente[]
  anotacao: string | null
}

const STATUS_LABEL: Record<string, string> = {
  ABERTO: 'Aberto', EM_ANALISE: 'Em Análise', ATRIBUIDO: 'Atribuído',
  EM_ANDAMENTO: 'Em Andamento', RESOLVIDO: 'Resolvido',
  ENCERRADO: 'Encerrado', CANCELADO: 'Cancelado',
}

const STATUS_BADGE: Record<string, string> = {
  ABERTO: 'badge-neutral', EM_ANALISE: 'badge-warning', ATRIBUIDO: 'badge-primary',
  EM_ANDAMENTO: 'badge-primary', RESOLVIDO: 'badge-success',
  ENCERRADO: 'badge-success', CANCELADO: 'badge-danger',
}

const PRIO_TAG: Record<string, string> = {
  critica: 'tag-critica', alta: 'tag-alta', media: 'tag-media',
  baixa: 'tag-baixa', normal: 'tag-normal',
}

export default function Dashboard() {
  const { usuario } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [anotacao, setAnotacao] = useState('')
  const [anotacaoSalva, setAnotacaoSalva] = useState('')
  const [salvandoNota, setSalvandoNota] = useState(false)
  const [notaSucesso, setNotaSucesso] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isAdmin = usuario?.role === 'admin'

  useEffect(() => {
    api.get<DashboardData>('/dashboard')
      .then(d => {
        setData(d)
        setAnotacao(d.anotacao ?? '')
        setAnotacaoSalva(d.anotacao ?? '')
      })
      .finally(() => setLoading(false))
  }, [])

  const salvarNota = async () => {
    setSalvandoNota(true)
    try {
      await api.patch('/anotacao', { conteudo: anotacao })
      setAnotacaoSalva(anotacao)
      setNotaSucesso(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setNotaSucesso(false), 2500)
    } finally {
      setSalvandoNota(false)
    }
  }

  if (loading) return (
    <AppShell>
      <p className="dash-loading">Carregando...</p>
    </AppShell>
  )

  return (
    <AppShell>
      <div className="dash-page">
        <h1 className="page-title">Dashboard</h1>

        <div className="dash-cards">
          <div className="dash-card">
            <span className="dash-card-label">Em aberto</span>
            <span className="dash-card-value">{data?.metricas.abertos ?? 0}</span>
          </div>
          <div className="dash-card">
            <span className="dash-card-label">Em andamento</span>
            <span className="dash-card-value dash-card-value--blue">{data?.metricas.em_andamento ?? 0}</span>
          </div>
          <div className="dash-card">
            <span className="dash-card-label">Resolvidos no mês</span>
            <span className="dash-card-value dash-card-value--green">{data?.metricas.resolvidos_mes ?? 0}</span>
          </div>
          <div className={`dash-card ${(data?.metricas.vencidos ?? 0) > 0 ? 'dash-card--danger' : ''}`}>
            <span className="dash-card-label">SLA vencido</span>
            <span className="dash-card-value dash-card-value--red">{data?.metricas.vencidos ?? 0}</span>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Chamados mais urgentes</span>
            <Link to="/chamados" className="dash-ver-todos">Ver todos →</Link>
          </div>

          {!data?.urgentes.length ? (
            <p className="dash-empty">Nenhum chamado com SLA pendente.</p>
          ) : (
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Título</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                  <th>SLA</th>
                  <th>Técnico</th>
                </tr>
              </thead>
              <tbody>
                {data.urgentes.map(c => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/chamados/${c.id}`} className="dash-proto">
                        {c.protocolo}
                      </Link>
                    </td>
                    <td className="dash-titulo">{c.titulo}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-neutral'}`}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </td>
                    <td>
                      <span className={`tag ${PRIO_TAG[c.prioridade] ?? 'tag-normal'}`}>
                        {c.prioridade}
                      </span>
                    </td>
                    <td>
                      <SlaCountdown prazo={c.sla_prazo} status={c.status} />
                    </td>
                    <td className="dash-tecnico">
                      {c.tecnicos.length === 0
                        ? <span style={{ color: 'var(--line)' }}>—</span>
                        : c.tecnicos.map(t => t.tecnico.nome).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {(isAdmin || anotacaoSalva) && (
          <div className="card dash-nota-card">
            <div className="card-header">
              <span className="card-title">📌 Mural de Avisos</span>
              {notaSucesso && <span className="dash-nota-ok">Salvo!</span>}
            </div>
            {isAdmin ? (
              <div className="dash-nota-editor">
                <textarea
                  className="form-textarea dash-nota-textarea"
                  rows={4}
                  placeholder="Deixe um aviso para a equipe..."
                  value={anotacao}
                  onChange={e => setAnotacao(e.target.value)}
                />
                <div className="dash-nota-actions">
                  {anotacao !== anotacaoSalva && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => setAnotacao(anotacaoSalva)}
                    >
                      Descartar
                    </button>
                  )}
                  <button
                    className="btn btn-primary"
                    onClick={salvarNota}
                    disabled={salvandoNota || anotacao === anotacaoSalva}
                  >
                    {salvandoNota ? 'Salvando...' : 'Salvar aviso'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="dash-nota-texto">{anotacaoSalva}</p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
