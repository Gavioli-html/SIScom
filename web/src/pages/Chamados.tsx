import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { api } from '../lib/api'
import SlaCountdown from '../components/SlaCountdown'
import './Chamados.css'

interface Chamado {
  id: number
  protocolo: string
  titulo: string
  status: string
  prioridade: string
  sla_prazo: string | null
  aberto_em: string
  area: { slug: string; nome: string }
  solicitante: { nome: string }
  tecnico: { nome: string } | null
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

export default function Chamados() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [chamados, setChamados] = useState<Chamado[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const status = searchParams.get('status') ?? ''
  const prioridade = searchParams.get('prioridade') ?? ''
  const q = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? '1')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (prioridade) params.set('prioridade', prioridade)
    if (q) params.set('q', q)
    params.set('page', String(page))

    api.get<{ chamados: Chamado[]; total: number }>(`/chamados?${params}`)
      .then(data => { setChamados(data.chamados); setTotal(data.total) })
      .finally(() => setLoading(false))
  }, [status, prioridade, q, page])

  const setFilter = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams)
    if (val) next.set(key, val); else next.delete(key)
    next.delete('page')
    setSearchParams(next)
  }

  return (
    <AppShell>
      <div className="chamados-page">
        <div className="chamados-header">
          <h1 className="page-title">Chamados</h1>
          <Link to="/chamados/novo" className="btn btn-primary">+ Novo Chamado</Link>
        </div>

        <div className="chamados-filters">
          <input
            className="form-input"
            placeholder="Buscar por protocolo ou título..."
            value={q}
            onChange={e => setFilter('q', e.target.value)}
          />
          <select className="form-select" value={status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="form-select" value={prioridade} onChange={e => setFilter('prioridade', e.target.value)}>
            <option value="">Todas as prioridades</option>
            {['critica', 'alta', 'media', 'baixa', 'normal'].map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="chamados-empty">Carregando...</p>
        ) : chamados.length === 0 ? (
          <p className="chamados-empty">Nenhum chamado encontrado.</p>
        ) : (
          <>
            <div className="chamados-count">{total} chamado{total !== 1 ? 's' : ''}</div>
            <div className="chamados-table-wrap">
              <table className="chamados-table">
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
                  {chamados.map(c => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/chamados/${c.id}`} className="chamados-proto">
                          {c.protocolo}
                        </Link>
                      </td>
                      <td className="chamados-titulo">{c.titulo}</td>
                      <td><span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-neutral'}`}>{STATUS_LABEL[c.status] ?? c.status}</span></td>
                      <td><span className={`tag ${PRIO_TAG[c.prioridade] ?? 'tag-normal'}`}>{c.prioridade}</span></td>
                      <td><SlaCountdown prazo={c.sla_prazo} status={c.status} /></td>
                      <td className="chamados-tecnico">{c.tecnico?.nome ?? <span className="sem-atribuicao">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
