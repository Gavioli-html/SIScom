import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { api } from '../lib/api'
import SlaCountdown from '../components/SlaCountdown'
import './Chamados.css'
import '../components/TagManager.css'

function exportarCSV(chamados: Chamado[]) {
  const cabecalho = ['Protocolo', 'Título', 'Status', 'Prioridade', 'Técnico', 'SLA', 'Abertura']
  const linhas = chamados.map(c => [
    c.protocolo,
    `"${c.titulo.replace(/"/g, '""')}"`,
    c.status,
    c.prioridade,
    c.tecnicos.map(t => t.tecnico.nome).join('; ') || '—',
    c.sla_prazo ? new Date(c.sla_prazo).toLocaleString('pt-BR') : '—',
    new Date(c.aberto_em).toLocaleString('pt-BR'),
  ])
  const csv = [cabecalho, ...linhas].map(r => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chamados-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface Tag {
  id: number
  slug: string
  label: string
  cor: string
}

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
  tecnicos: { tecnico: { nome: string } }[]
  tags: { tag: Tag }[]
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
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [todasTags, setTodasTags] = useState<Tag[]>([])

  const status = searchParams.get('status') ?? ''
  const prioridade = searchParams.get('prioridade') ?? ''
  const q = searchParams.get('q') ?? ''
  const tag = searchParams.get('tag') ?? ''
  const page = Number(searchParams.get('page') ?? '1')

  useEffect(() => {
    api.get<{ tags: Tag[] }>('/tags').then(d => setTodasTags(d.tags))
  }, [])

  const buildParams = (extra?: Record<string, string>) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (prioridade) params.set('prioridade', prioridade)
    if (q) params.set('q', q)
    if (tag) params.set('tag', tag)
    params.set('page', String(page))
    Object.entries(extra ?? {}).forEach(([k, v]) => params.set(k, v))
    return params
  }

  useEffect(() => {
    let cancelado = false
    setLoading(true)
    api.get<{ chamados: Chamado[]; total: number; pages: number }>(`/chamados?${buildParams()}`)
      .then(data => {
        if (!cancelado) {
          setChamados(data.chamados)
          setTotal(data.total)
          setPages(data.pages)
        }
      })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
  }, [status, prioridade, q, tag, page])

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
          <div className="chamados-header-actions">
            {chamados.length > 0 && (
              <button className="btn btn-secondary" onClick={() => exportarCSV(chamados)}>
                ↓ CSV
              </button>
            )}
            <Link to="/chamados/novo" className="btn btn-primary">+ Novo Chamado</Link>
          </div>
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
          {todasTags.length > 0 && (
            <select className="form-select" value={tag} onChange={e => setFilter('tag', e.target.value)}>
              <option value="">Todas as tags</option>
              {todasTags.map(t => (
                <option key={t.slug} value={t.slug}>#{t.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Tags ativas como chips clicáveis */}
        {todasTags.length > 0 && (
          <div className="chamados-tag-chips">
            {todasTags.map(t => (
              <button
                key={t.slug}
                className={`tag-global${tag === t.slug ? ' tag-global-ativo' : ''}`}
                style={{ '--tag-cor': t.cor } as React.CSSProperties}
                onClick={() => setFilter('tag', tag === t.slug ? '' : t.slug)}
              >
                #{t.label}
              </button>
            ))}
          </div>
        )}

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
                      <td className="chamados-titulo-cell">
                        <span className="chamados-titulo">{c.titulo}</span>
                        {c.tags.length > 0 && (
                          <div className="chamados-row-tags">
                            {c.tags.map(({ tag: t }) => (
                              <span
                                key={t.id}
                                className="tag-global"
                                style={{ '--tag-cor': t.cor } as React.CSSProperties}
                              >
                                #{t.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td><span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-neutral'}`}>{STATUS_LABEL[c.status] ?? c.status}</span></td>
                      <td><span className={`tag ${PRIO_TAG[c.prioridade] ?? 'tag-normal'}`}>{c.prioridade}</span></td>
                      <td><SlaCountdown prazo={c.sla_prazo} status={c.status} /></td>
                      <td className="chamados-tecnico">
                        {c.tecnicos.length === 0
                          ? <span className="sem-atribuicao">—</span>
                          : c.tecnicos.length === 1
                            ? c.tecnicos[0].tecnico.nome
                            : `${c.tecnicos[0].tecnico.nome} +${c.tecnicos.length - 1}`
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="chamados-paginacao">
                <button
                  className="btn btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setFilter('page', String(page - 1))}
                >
                  ← Anterior
                </button>
                <span className="chamados-pagina-info">
                  Página {page} de {pages}
                </span>
                <button
                  className="btn btn-secondary"
                  disabled={page >= pages}
                  onClick={() => setFilter('page', String(page + 1))}
                >
                  Próxima →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
