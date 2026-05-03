import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { api } from '../lib/api'
import SlaCountdown from '../components/SlaCountdown'
import Chat from '../components/Chat'
import PainelAcoes from '../components/PainelAcoes'
import './Chamado.css'

interface ChamadoDetalhe {
  id: number
  protocolo: string
  titulo: string
  descricao: string
  status: string
  prioridade: string
  sla_prazo: string | null
  aberto_em: string
  fechado_em: string | null
  area: { slug: string; nome: string }
  template: { nome: string }
  solicitante: { id: number; nome: string; email: string }
  tecnico: { id: number; nome: string; email: string } | null
  campos: { id: number; chave: string; valor: string }[]
  secretaria_solicitante: string | null
}

const STATUS_BADGE: Record<string, string> = {
  ABERTO: 'badge-neutral', EM_ANALISE: 'badge-warning', ATRIBUIDO: 'badge-primary',
  EM_ANDAMENTO: 'badge-primary', RESOLVIDO: 'badge-success',
  ENCERRADO: 'badge-success', CANCELADO: 'badge-danger',
}

const STATUS_LABEL: Record<string, string> = {
  ABERTO: 'Aberto', EM_ANALISE: 'Em Análise', ATRIBUIDO: 'Atribuído',
  EM_ANDAMENTO: 'Em Andamento', RESOLVIDO: 'Resolvido',
  ENCERRADO: 'Encerrado', CANCELADO: 'Cancelado',
}

const PRIO_TAG: Record<string, string> = {
  critica: 'tag-critica', alta: 'tag-alta', media: 'tag-media',
  baixa: 'tag-baixa', normal: 'tag-normal',
}

const ENCERRADOS = ['RESOLVIDO', 'ENCERRADO', 'CANCELADO']

function fmtData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Chamado() {
  const { id } = useParams<{ id: string }>()
  const [chamado, setChamado] = useState<ChamadoDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(() => {
    api.get<{ chamado: ChamadoDetalhe }>(`/chamados/${id}`)
      .then(d => setChamado(d.chamado))
      .catch(() => setErro('Chamado não encontrado'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  if (loading) return <AppShell><p className="chamado-loading">Carregando...</p></AppShell>
  if (erro || !chamado) return <AppShell><div className="alert alert-danger" style={{ maxWidth: 400 }}>{erro}</div></AppShell>

  const encerrado = ENCERRADOS.includes(chamado.status)

  return (
    <AppShell>
      <div className="chamado-page">

        <div className="chamado-header">
          <div className="chamado-header-top">
            <Link to="/chamados" className="chamado-back">← Chamados</Link>
            <div className="chamado-header-badges">
              <span className={`badge ${STATUS_BADGE[chamado.status] ?? 'badge-neutral'}`}>
                {STATUS_LABEL[chamado.status] ?? chamado.status}
              </span>
              <span className={`tag ${PRIO_TAG[chamado.prioridade] ?? 'tag-normal'}`}>
                {chamado.prioridade}
              </span>
            </div>
          </div>
          <div className="chamado-proto">{chamado.protocolo}</div>
          <h1 className="chamado-titulo">{chamado.titulo}</h1>
          <div className="chamado-meta">
            <span>Aberto em {fmtData(chamado.aberto_em)}</span>
            <span>por <strong>{chamado.solicitante.nome}</strong></span>
            <span>·</span>
            <span>SLA: <SlaCountdown prazo={chamado.sla_prazo} status={chamado.status} /></span>
          </div>
        </div>

        <div className="chamado-body">
          <div className="chamado-main">
            <div className="card">
              <div className="card-header"><span className="card-title">Descrição</span></div>
              <p className="chamado-descricao">{chamado.descricao}</p>
            </div>

            {chamado.campos.length > 0 && (
              <div className="card">
                <div className="card-header"><span className="card-title">Campos do Template</span></div>
                <dl className="chamado-campos">
                  {chamado.campos.map(c => (
                    <div key={c.id} className="chamado-campo">
                      <dt>{c.chave}</dt>
                      <dd>{c.valor}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="card">
              <Chat chamadoId={chamado.id} encerrado={encerrado} />
            </div>
          </div>

          <aside className="chamado-sidebar">
            <PainelAcoes
              chamadoId={chamado.id}
              statusAtual={chamado.status}
              tecnicoAtual={chamado.tecnico}
              onUpdate={carregar}
            />

            <div className="card">
              <div className="card-header"><span className="card-title">Informações</span></div>
              <dl className="chamado-info-list">
                {chamado.secretaria_solicitante && (
                  <><dt>Secretaria</dt><dd>{chamado.secretaria_solicitante}</dd></>
                )}
                <dt>Área</dt><dd>{chamado.area.nome}</dd>
                <dt>Template</dt><dd>{chamado.template.nome}</dd>
                <dt>Técnico</dt>
                <dd>{chamado.tecnico?.nome ?? <span style={{ color: 'var(--line)' }}>Não atribuído</span>}</dd>
                {chamado.fechado_em && (<><dt>Fechado em</dt><dd>{fmtData(chamado.fechado_em)}</dd></>)}
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
