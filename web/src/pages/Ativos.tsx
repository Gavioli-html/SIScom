import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import './Ativos.css'

interface Ativo {
  id: number
  patrimonio: string
  tipo: string
  descricao: string | null
  localizacao: string | null
  ip: string | null
  marca: string | null
  modelo: string | null
  garantia_ate: string | null
  status: string
}

const TIPOS = ['Computador', 'Impressora', 'Switch', 'Roteador', 'Servidor', 'Nobreak', 'Monitor', 'Projetor', 'Outro']
const STATUS_LIST = ['ativo', 'manutencao', 'desativado', 'descartado']
const STATUS_LABEL: Record<string, string> = {
  ativo: 'Ativo', manutencao: 'Em Manutenção', desativado: 'Desativado', descartado: 'Descartado',
}
const STATUS_BADGE: Record<string, string> = {
  ativo: 'badge-success', manutencao: 'badge-warning', desativado: 'badge-neutral', descartado: 'badge-danger',
}

function garantiaBadge(garantia_ate: string | null) {
  if (!garantia_ate) return null
  const dias = Math.ceil((new Date(garantia_ate).getTime() - Date.now()) / 86400000)
  if (dias < 0) return <span className="tag tag-critica">Garantia vencida</span>
  if (dias <= 90) return <span className="tag tag-alta">Garantia: {dias}d</span>
  return null
}

const BLANK = {
  patrimonio: '', tipo: 'Computador', descricao: '', localizacao: '',
  ip: '', mac: '', marca: '', modelo: '', nr_serie: '',
  comprado_em: '', garantia_ate: '', status: 'ativo', observacoes: '',
}

export default function Ativos() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [ativos, setAtivos] = useState<Ativo[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ ...BLANK })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const tipo = searchParams.get('tipo') ?? ''
  const status = searchParams.get('status') ?? ''
  const q = searchParams.get('q') ?? ''

  useEffect(() => {
    if (usuario?.area.slug !== 'ti') { navigate('/dashboard'); return }
  }, [usuario])

  const carregar = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (tipo) p.set('tipo', tipo)
    if (status) p.set('status', status)
    if (q) p.set('q', q)
    api.get<{ ativos: Ativo[] }>(`/ativos?${p}`)
      .then(d => setAtivos(d.ativos))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [tipo, status, q])

  const setFilter = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams)
    if (val) next.set(key, val); else next.delete(key)
    setSearchParams(next)
  }

  const abrirModal = () => { setForm({ ...BLANK }); setErro(''); setModal(true) }

  const salvar = async () => {
    if (!form.patrimonio || !form.tipo) { setErro('Patrimônio e tipo são obrigatórios'); return }
    setSalvando(true); setErro('')
    try {
      await api.post('/ativos', form)
      setModal(false)
      carregar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <AppShell>
      <div className="ativos-page">
        <div className="ativos-header">
          <h1 className="page-title">Inventário de Ativos</h1>
          <button className="btn btn-primary" onClick={abrirModal}>+ Novo Ativo</button>
        </div>

        <div className="ativos-filters">
          <input
            className="form-input"
            placeholder="Buscar por patrimônio, descrição..."
            value={q}
            onChange={e => setFilter('q', e.target.value)}
          />
          <select className="form-select" value={tipo} onChange={e => setFilter('tipo', e.target.value)}>
            <option value="">Todos os tipos</option>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="form-select" value={status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">Todos os status</option>
            {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="ativos-empty">Carregando...</p>
        ) : ativos.length === 0 ? (
          <p className="ativos-empty">Nenhum ativo encontrado.</p>
        ) : (
          <>
            <div className="ativos-count">{ativos.length} ativo{ativos.length !== 1 ? 's' : ''}</div>
            <div className="ativos-table-wrap">
              <table className="ativos-table">
                <thead>
                  <tr>
                    <th>Patrimônio</th>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th>IP</th>
                    <th>Localização</th>
                    <th>Status</th>
                    <th>Garantia</th>
                  </tr>
                </thead>
                <tbody>
                  {ativos.map(a => (
                    <tr key={a.id}>
                      <td>
                        <Link to={`/ativos/${a.id}`} className="ativos-link">{a.patrimonio}</Link>
                      </td>
                      <td className="ativos-tipo">{a.tipo}</td>
                      <td className="ativos-desc">{a.descricao ?? <span className="ativos-vazio">—</span>}</td>
                      <td className="ativos-mono">{a.ip ?? <span className="ativos-vazio">—</span>}</td>
                      <td className="ativos-loc">{a.localizacao ?? <span className="ativos-vazio">—</span>}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[a.status] ?? 'badge-neutral'}`}>
                          {STATUS_LABEL[a.status] ?? a.status}
                        </span>
                      </td>
                      <td>{garantiaBadge(a.garantia_ate) ?? <span className="ativos-vazio">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {modal && (
        <div className="ativos-modal-overlay" onClick={() => setModal(false)}>
          <div className="ativos-modal card" onClick={e => e.stopPropagation()}>
            <div className="card-header">
              <span className="card-title">Novo Ativo</span>
              <button className="ativos-modal-close" onClick={() => setModal(false)}>✕</button>
            </div>

            {erro && <div className="alert alert-danger" style={{ margin: '0 var(--space-5)' }}>{erro}</div>}

            <div className="ativos-form">
              <div className="ativos-form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="at-patrimonio">Nº Patrimônio <span className="required">*</span></label>
                  <input id="at-patrimonio" className="form-input" value={form.patrimonio} onChange={f('patrimonio')} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="at-tipo">Tipo <span className="required">*</span></label>
                  <select id="at-tipo" className="form-select" value={form.tipo} onChange={f('tipo')}>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="at-descricao">Descrição</label>
                <input id="at-descricao" className="form-input" value={form.descricao} onChange={f('descricao')} />
              </div>

              <div className="ativos-form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="at-marca">Marca</label>
                  <input id="at-marca" className="form-input" value={form.marca} onChange={f('marca')} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="at-modelo">Modelo</label>
                  <input id="at-modelo" className="form-input" value={form.modelo} onChange={f('modelo')} />
                </div>
              </div>

              <div className="ativos-form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="at-ip">IP</label>
                  <input id="at-ip" className="form-input" placeholder="192.168.1.1" value={form.ip} onChange={f('ip')} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="at-mac">MAC</label>
                  <input id="at-mac" className="form-input" placeholder="AA:BB:CC:DD:EE:FF" value={form.mac} onChange={f('mac')} />
                </div>
              </div>

              <div className="ativos-form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="at-serie">Nº de Série</label>
                  <input id="at-serie" className="form-input" value={form.nr_serie} onChange={f('nr_serie')} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="at-localizacao">Localização</label>
                  <input id="at-localizacao" className="form-input" value={form.localizacao} onChange={f('localizacao')} />
                </div>
              </div>

              <div className="ativos-form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="at-comprado">Data de Compra</label>
                  <input id="at-comprado" type="date" className="form-input" value={form.comprado_em} onChange={f('comprado_em')} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="at-garantia">Garantia até</label>
                  <input id="at-garantia" type="date" className="form-input" value={form.garantia_ate} onChange={f('garantia_ate')} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="at-status">Status</label>
                <select id="at-status" className="form-select" value={form.status} onChange={f('status')}>
                  {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="at-obs">Observações</label>
                <textarea id="at-obs" className="form-textarea" rows={2} value={form.observacoes} onChange={f('observacoes')} />
              </div>
            </div>

            <div className="ativos-modal-actions">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Cadastrar Ativo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
