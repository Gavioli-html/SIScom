import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { api } from '../lib/api'
import SlaCountdown from '../components/SlaCountdown'
import Chat from '../components/Chat'
import PainelAcoes from '../components/PainelAcoes'
import TagManager from '../components/TagManager'
import './Chamado.css'

interface Tag {
  id: number
  slug: string
  label: string
  cor: string
}

interface HistoricoItem {
  id: number
  tipo: string
  descricao: string
  criado_em: string
  autor: { id: number; nome: string } | null
}

interface AtivoVinculado {
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
  tecnicos: { tecnico: { id: number; nome: string; email: string } }[]
  campos: { id: number; chave: string; valor: string }[]
  secretaria_solicitante: string | null
  tags: { tag: Tag }[]
  historico: HistoricoItem[]
  ativos: { ativo: AtivoVinculado }[]
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

const HISTORICO_ICONE: Record<string, string> = {
  ABERTURA:    '✦',
  STATUS:      '↻',
  ATRIBUICAO:  '→',
  REMOCAO:     '←',
  TAG:         '#',
  TAG_REMOCAO: '×',
}

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
  const tagsAtuais = chamado.tags.map(t => t.tag)

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
          {tagsAtuais.length > 0 && (
            <div className="chamado-tags">
              {tagsAtuais.map(tag => (
                <span
                  key={tag.id}
                  className="tag-global"
                  style={{ '--tag-cor': tag.cor } as React.CSSProperties}
                >
                  #{tag.label}
                </span>
              ))}
            </div>
          )}
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
                  {chamado.campos.map(c => {
                    const itens = c.valor.includes(',') ? c.valor.split(',').filter(Boolean) : null
                    return (
                      <div key={c.id} className="chamado-campo">
                        <dt>{c.chave}</dt>
                        <dd>
                          {itens ? (
                            <div className="chamado-campo-chips">
                              {itens.map(item => (
                                <span key={item} className="chamado-campo-chip">{item}</span>
                              ))}
                            </div>
                          ) : c.valor}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </div>
            )}

            <div className="card">
              <Chat chamadoId={chamado.id} encerrado={encerrado} />
            </div>

            {chamado.historico.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Histórico de Atividade</span>
                </div>
                <ol className="historico-lista">
                  {chamado.historico.map(h => (
                    <li key={h.id} className={`historico-item historico-${h.tipo.toLowerCase()}`}>
                      <span className="historico-icone" aria-hidden="true">
                        {HISTORICO_ICONE[h.tipo] ?? '·'}
                      </span>
                      <div className="historico-corpo">
                        <span className="historico-desc">{h.descricao}</span>
                        <span className="historico-meta">
                          {h.autor ? h.autor.nome : 'Sistema'}
                          {' · '}
                          {fmtData(h.criado_em)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <aside className="chamado-sidebar">
            <PainelAcoes
              chamadoId={chamado.id}
              statusAtual={chamado.status}
              tecnicosAtuais={chamado.tecnicos.map(t => t.tecnico)}
              onUpdate={carregar}
            />

            <TagManager
              chamadoId={chamado.id}
              tagsAtuais={tagsAtuais}
              encerrado={encerrado}
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
                <dt>Técnico{chamado.tecnicos.length !== 1 ? 's' : ''}</dt>
                <dd>
                  {chamado.tecnicos.length === 0
                    ? <span style={{ color: 'var(--line)' }}>Não atribuído</span>
                    : chamado.tecnicos.map(t => t.tecnico.nome).join(', ')
                  }
                </dd>
                {chamado.fechado_em && (<><dt>Fechado em</dt><dd>{fmtData(chamado.fechado_em)}</dd></>)}
              </dl>
            </div>

            {chamado.ativos && chamado.ativos.length > 0 && (
              <div className="card">
                <div className="card-header"><span className="card-title">Ativo Vinculado</span></div>
                {chamado.ativos.map(({ ativo }) => (
                  <dl key={ativo.id} className="chamado-info-list chamado-ativo-card">
                    <dt>Patrimônio</dt>
                    <dd>
                      <Link to={`/ativos/${ativo.id}`} className="chamado-ativo-link">
                        {ativo.patrimonio}
                      </Link>
                    </dd>
                    <dt>Tipo</dt><dd>{ativo.tipo}</dd>
                    {ativo.descricao && (<><dt>Desc.</dt><dd>{ativo.descricao}</dd></>)}
                    {ativo.marca && (<><dt>Marca</dt><dd>{ativo.marca}{ativo.modelo ? ` ${ativo.modelo}` : ''}</dd></>)}
                    {ativo.ip && (<><dt>IP</dt><dd style={{ fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)' }}>{ativo.ip}</dd></>)}
                    {ativo.localizacao && (<><dt>Local</dt><dd>{ativo.localizacao}</dd></>)}
                  </dl>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
