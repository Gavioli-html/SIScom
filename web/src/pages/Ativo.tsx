import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import './Ativo.css'

interface AtivoDetalhe {
  id: number
  patrimonio: string
  tipo: string
  descricao: string | null
  localizacao: string | null
  ip: string | null
  mac: string | null
  marca: string | null
  modelo: string | null
  nr_serie: string | null
  comprado_em: string | null
  garantia_ate: string | null
  status: string
  observacoes: string | null
  criado_em: string
  chamados: {
    chamado: {
      id: number
      protocolo: string
      titulo: string
      status: string
      prioridade: string
      aberto_em: string
    }
  }[]
}

const STATUS_LIST = ['ativo', 'manutencao', 'desativado', 'descartado']
const STATUS_LABEL: Record<string, string> = {
  ativo: 'Ativo', manutencao: 'Em Manutenção', desativado: 'Desativado', descartado: 'Descartado',
}
const STATUS_BADGE: Record<string, string> = {
  ativo: 'badge-success', manutencao: 'badge-warning', desativado: 'badge-neutral', descartado: 'badge-danger',
}
const CHAMADO_STATUS_BADGE: Record<string, string> = {
  ABERTO: 'badge-neutral', EM_ANALISE: 'badge-warning', ATRIBUIDO: 'badge-primary',
  EM_ANDAMENTO: 'badge-primary', RESOLVIDO: 'badge-success',
  ENCERRADO: 'badge-success', CANCELADO: 'badge-danger',
}
const CHAMADO_STATUS_LABEL: Record<string, string> = {
  ABERTO: 'Aberto', EM_ANALISE: 'Em Análise', ATRIBUIDO: 'Atribuído',
  EM_ANDAMENTO: 'Em Andamento', RESOLVIDO: 'Resolvido', ENCERRADO: 'Encerrado', CANCELADO: 'Cancelado',
}
const TIPOS = ['Computador', 'Impressora', 'Switch', 'Roteador', 'Servidor', 'Nobreak', 'Monitor', 'Projetor', 'Outro']

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function garantiaBadge(garantia_ate: string | null) {
  if (!garantia_ate) return null
  const dias = Math.ceil((new Date(garantia_ate).getTime() - Date.now()) / 86400000)
  if (dias < 0) return <span className="tag tag-critica">Garantia vencida há {Math.abs(dias)}d</span>
  if (dias <= 90) return <span className="tag tag-alta">Vence em {dias} dia{dias !== 1 ? 's' : ''}</span>
  return <span className="tag tag-normal">OK — {fmtData(garantia_ate)}</span>
}

export default function Ativo() {
  const { id } = useParams<{ id: string }>()
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [ativo, setAtivo] = useState<AtivoDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [erroEdit, setErroEdit] = useState('')

  useEffect(() => {
    if (usuario?.area.slug !== 'ti') { navigate('/dashboard'); return }
  }, [usuario])

  const carregar = () => {
    api.get<{ ativo: AtivoDetalhe }>(`/ativos/${id}`)
      .then(d => setAtivo(d.ativo))
      .catch(() => setErro('Ativo não encontrado'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [id])

  const abrirEdit = () => {
    if (!ativo) return
    setForm({
      tipo: ativo.tipo,
      descricao: ativo.descricao ?? '',
      localizacao: ativo.localizacao ?? '',
      ip: ativo.ip ?? '',
      mac: ativo.mac ?? '',
      marca: ativo.marca ?? '',
      modelo: ativo.modelo ?? '',
      nr_serie: ativo.nr_serie ?? '',
      comprado_em: ativo.comprado_em ? ativo.comprado_em.slice(0, 10) : '',
      garantia_ate: ativo.garantia_ate ? ativo.garantia_ate.slice(0, 10) : '',
      status: ativo.status,
      observacoes: ativo.observacoes ?? '',
    })
    setErroEdit('')
    setEditando(true)
  }

  const salvar = async () => {
    setSalvando(true); setErroEdit('')
    try {
      await api.patch(`/ativos/${id}`, form)
      setEditando(false)
      carregar()
    } catch (e: unknown) {
      setErroEdit(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  if (loading) return <AppShell><p className="ativo-loading">Carregando...</p></AppShell>
  if (erro || !ativo) return (
    <AppShell>
      <div className="alert alert-danger" style={{ maxWidth: 400 }}>{erro || 'Ativo não encontrado'}</div>
    </AppShell>
  )

  return (
    <AppShell>
      <div className="ativo-page">
        <div className="ativo-header">
          <Link to="/ativos" className="ativo-back">← Inventário</Link>
          <div className="ativo-header-main">
            <div className="ativo-patrimonio-row">
              <span className="ativo-patrimonio">{ativo.patrimonio}</span>
              <span className={`badge ${STATUS_BADGE[ativo.status] ?? 'badge-neutral'}`}>
                {STATUS_LABEL[ativo.status] ?? ativo.status}
              </span>
              {garantiaBadge(ativo.garantia_ate)}
            </div>
            <h1 className="ativo-titulo">{ativo.descricao ?? ativo.tipo}</h1>
            <div className="ativo-tipo-label">{ativo.tipo}</div>
          </div>
          <button className="btn btn-secondary" onClick={abrirEdit}>Editar</button>
        </div>

        <div className="ativo-body">
          <div className="ativo-main">
            <div className="card">
              <div className="card-header"><span className="card-title">Especificações</span></div>
              <dl className="ativo-specs">
                {ativo.marca && (<><dt>Marca</dt><dd>{ativo.marca}</dd></>)}
                {ativo.modelo && (<><dt>Modelo</dt><dd>{ativo.modelo}</dd></>)}
                {ativo.nr_serie && (<><dt>Nº de Série</dt><dd className="ativo-mono">{ativo.nr_serie}</dd></>)}
                {ativo.ip && (<><dt>IP</dt><dd className="ativo-mono">{ativo.ip}</dd></>)}
                {ativo.mac && (<><dt>MAC</dt><dd className="ativo-mono">{ativo.mac}</dd></>)}
                {ativo.localizacao && (<><dt>Localização</dt><dd>{ativo.localizacao}</dd></>)}
                {ativo.comprado_em && (<><dt>Comprado em</dt><dd>{fmtData(ativo.comprado_em)}</dd></>)}
                {ativo.garantia_ate && (<><dt>Garantia até</dt><dd>{fmtData(ativo.garantia_ate)}</dd></>)}
                <dt>Cadastrado em</dt><dd>{fmtData(ativo.criado_em)}</dd>
              </dl>
              {ativo.observacoes && (
                <div className="ativo-obs">
                  <div className="ativo-obs-label">Observações</div>
                  <p>{ativo.observacoes}</p>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Chamados Vinculados</span>
                <span className="card-count">{ativo.chamados.length}</span>
              </div>
              {ativo.chamados.length === 0 ? (
                <p className="ativo-empty">Nenhum chamado vinculado a este ativo.</p>
              ) : (
                <ul className="ativo-chamados-lista">
                  {ativo.chamados.map(({ chamado: c }) => (
                    <li key={c.id} className="ativo-chamado-item">
                      <div className="ativo-chamado-top">
                        <Link to={`/chamados/${c.id}`} className="ativo-chamado-proto">{c.protocolo}</Link>
                        <span className={`badge ${CHAMADO_STATUS_BADGE[c.status] ?? 'badge-neutral'}`}>
                          {CHAMADO_STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </div>
                      <div className="ativo-chamado-titulo">{c.titulo}</div>
                      <div className="ativo-chamado-meta">{fmtData(c.aberto_em)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {editando && (
        <div className="ativo-modal-overlay" onClick={() => setEditando(false)}>
          <div className="ativo-modal card" onClick={e => e.stopPropagation()}>
            <div className="card-header">
              <span className="card-title">Editar Ativo — {ativo.patrimonio}</span>
              <button className="ativos-modal-close" onClick={() => setEditando(false)}>✕</button>
            </div>

            {erroEdit && <div className="alert alert-danger" style={{ margin: '0 var(--space-5)' }}>{erroEdit}</div>}

            <div className="ativos-form">
              <div className="form-group">
                <label className="form-label" htmlFor="edit-tipo">Tipo</label>
                <select id="edit-tipo" className="form-select" value={form.tipo} onChange={f('tipo')}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-descricao">Descrição</label>
                <input id="edit-descricao" className="form-input" value={form.descricao} onChange={f('descricao')} />
              </div>

              <div className="ativos-form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-marca">Marca</label>
                  <input id="edit-marca" className="form-input" value={form.marca} onChange={f('marca')} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-modelo">Modelo</label>
                  <input id="edit-modelo" className="form-input" value={form.modelo} onChange={f('modelo')} />
                </div>
              </div>

              <div className="ativos-form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-ip">IP</label>
                  <input id="edit-ip" className="form-input" value={form.ip} onChange={f('ip')} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-mac">MAC</label>
                  <input id="edit-mac" className="form-input" value={form.mac} onChange={f('mac')} />
                </div>
              </div>

              <div className="ativos-form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-serie">Nº de Série</label>
                  <input id="edit-serie" className="form-input" value={form.nr_serie} onChange={f('nr_serie')} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-loc">Localização</label>
                  <input id="edit-loc" className="form-input" value={form.localizacao} onChange={f('localizacao')} />
                </div>
              </div>

              <div className="ativos-form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-comprado">Data de Compra</label>
                  <input id="edit-comprado" type="date" className="form-input" value={form.comprado_em} onChange={f('comprado_em')} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-garantia">Garantia até</label>
                  <input id="edit-garantia" type="date" className="form-input" value={form.garantia_ate} onChange={f('garantia_ate')} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-status">Status</label>
                <select id="edit-status" className="form-select" value={form.status} onChange={f('status')}>
                  {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-obs">Observações</label>
                <textarea id="edit-obs" className="form-textarea" rows={3} value={form.observacoes} onChange={f('observacoes')} />
              </div>
            </div>

            <div className="ativos-modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditando(false)}>Cancelar</button>
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
