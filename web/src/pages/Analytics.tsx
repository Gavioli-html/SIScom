import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar,
} from 'recharts'
import AppShell from '../components/layout/AppShell'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import './Analytics.css'

/* ── tipos ──────────────────────────────────────────── */
interface Resumo { total: number; resolvidos: number; vencidos: number; em_aberto: number; taxa_sla: number }
interface RankItem { nome: string; total: number; resolvidos?: number; abertos?: number }
interface StatusItem { status: string; label: string; total: number }
interface PrioItem { prioridade: string; total: number }
interface Alerta { tipo: string; titulo: string; mensagem: string }

/* ── cores derivadas dos tokens ──────────────────────── */
const C = {
  accent:   '#0066cc',
  success:  '#4a6741',
  warning:  '#7a5c1e',
  danger:   '#6b2233',
  soft:     '#5262c4',
  mid:      '#2b3278',
  line:     '#d4d2cc',
  paper:    '#f7f6f2',
  ink:      '#0d1433',
}

const STATUS_COR: Record<string, string> = {
  ABERTO: C.line, EM_ANALISE: C.warning, ATRIBUIDO: C.soft,
  EM_ANDAMENTO: C.accent, RESOLVIDO: C.success, ENCERRADO: C.success, CANCELADO: C.danger,
}

const PRIO_COR: Record<string, string> = {
  critica: C.danger, alta: '#a33', media: C.warning, baixa: C.success, normal: C.line,
}

const SERIES_CORES = [C.accent, C.success, C.warning, C.danger, C.soft, C.mid]

const PERIODOS = [{ v: '7d', l: '7 dias' }, { v: '30d', l: '30 dias' }, { v: '90d', l: '90 dias' }]

/* ── tooltip customizado ─────────────────────────────── */
const TooltipCustom = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="an-tooltip">
      {label && <p className="an-tooltip-label">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill ?? p.color ?? C.accent }}>
          {p.name ?? ''}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

/* ── helpers ─────────────────────────────────────────── */
function GaugeCard({ taxa }: { taxa: number }) {
  const data = [{ name: 'SLA', value: taxa, fill: taxa >= 80 ? C.success : taxa >= 50 ? C.warning : C.danger }]
  return (
    <div className="an-gauge-wrap">
      <ResponsiveContainer width="100%" height={120}>
        <RadialBarChart innerRadius="60%" outerRadius="100%" data={data} startAngle={180} endAngle={0}>
          <RadialBar dataKey="value" cornerRadius={4} background={{ fill: C.line }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="an-gauge-label">
        <span className="an-gauge-value" style={{ color: data[0].fill }}>{taxa}%</span>
        <span className="an-gauge-sub">no SLA</span>
      </div>
    </div>
  )
}

/* ── componente principal ────────────────────────────── */
export default function Analytics() {
  const { usuario } = useAuth()
  const [periodo, setPeriodo] = useState('30d')

  const [resumo, setResumo]     = useState<Resumo | null>(null)
  const [areas, setAreas]       = useState<RankItem[]>([])
  const [solics, setSolics]     = useState<RankItem[]>([])
  const [tecnicos, setTecnicos] = useState<RankItem[]>([])
  const [status, setStatus]     = useState<StatusItem[]>([])
  const [prios, setPrios]       = useState<PrioItem[]>([])
  const [alertas, setAlertas]   = useState<Alerta[]>([])
  const [loading, setLoading]   = useState(true)

  const carregar = useCallback(() => {
    setLoading(true)
    const q = `?periodo=${periodo}`
    Promise.all([
      api.get<{ resumo: Resumo }>(`/analytics/resumo${q}`),
      api.get<{ areas: RankItem[] }>(`/analytics/top-areas${q}`),
      api.get<{ solicitantes: RankItem[] }>(`/analytics/top-solicitantes${q}`),
      api.get<{ tecnicos: RankItem[] }>(`/analytics/top-tecnicos${q}`),
      api.get<{ status: StatusItem[] }>(`/analytics/por-status${q}`),
      api.get<{ prioridades: PrioItem[] }>(`/analytics/por-prioridade${q}`),
      api.get<{ alertas: Alerta[] }>('/analytics/alertas'),
    ]).then(([r, a, s, t, st, p, al]) => {
      setResumo(r.resumo)
      setAreas(a.areas)
      setSolics(s.solicitantes)
      setTecnicos(t.tecnicos)
      setStatus(st.status)
      setPrios(p.prioridades)
      setAlertas(al.alertas)
    }).finally(() => setLoading(false))
  }, [periodo])

  useEffect(() => { carregar() }, [carregar])

  const ALERTA_BADGE: Record<string, string> = {
    danger: 'alert-danger', warning: 'alert-warning',
    success: 'alert-success', info: 'alert-info',
  }

  return (
    <AppShell>
      <div className="an-page">

        {/* cabeçalho */}
        <div className="an-header">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="an-sub">Visão gerencial · {usuario?.area.nome}</p>
          </div>
          <div className="an-filtros">
            {PERIODOS.map(p => (
              <button
                key={p.v}
                className={`an-periodo-btn${periodo === p.v ? ' an-periodo-btn--ativo' : ''}`}
                onClick={() => setPeriodo(p.v)}
              >
                {p.l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="an-loading">Carregando dados...</p>
        ) : (
          <>
            {/* alertas */}
            {alertas.length > 0 && (
              <div className="an-alertas">
                {alertas.map((a, i) => (
                  <div key={i} className={`alert ${ALERTA_BADGE[a.tipo] ?? 'alert-info'} an-alerta`}>
                    <strong>{a.titulo}</strong> — {a.mensagem}
                  </div>
                ))}
              </div>
            )}

            {/* bloco 1 — cards de métricas */}
            <div className="an-cards">
              <div className="an-card">
                <span className="an-card-label">Total de chamados</span>
                <span className="an-card-value">{resumo?.total ?? 0}</span>
              </div>
              <div className="an-card">
                <span className="an-card-label">Em aberto</span>
                <span className="an-card-value" style={{ color: C.accent }}>{resumo?.em_aberto ?? 0}</span>
              </div>
              <div className="an-card">
                <span className="an-card-label">Resolvidos</span>
                <span className="an-card-value" style={{ color: C.success }}>{resumo?.resolvidos ?? 0}</span>
              </div>
              <div className="an-card">
                <span className="an-card-label">SLA vencidos</span>
                <span className="an-card-value" style={{ color: resumo?.vencidos ? C.danger : C.success }}>
                  {resumo?.vencidos ?? 0}
                </span>
              </div>
              <div className="an-card an-card--gauge">
                <span className="an-card-label">Taxa de SLA</span>
                <GaugeCard taxa={resumo?.taxa_sla ?? 0} />
              </div>
            </div>

            {/* bloco 2 — rankings */}
            <div className="an-section-title">Rankings</div>
            <div className="an-charts-grid">

              {/* top áreas */}
              <div className="card an-chart-card">
                <div className="card-header"><span className="card-title">Chamados por Área</span></div>
                {areas.length === 0 ? <p className="an-empty">Sem dados</p> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={areas} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="nome" width={80} tick={{ fontSize: 12, fontFamily: 'var(--mono)', fill: C.ink }} />
                      <Tooltip content={<TooltipCustom />} />
                      <Bar dataKey="total" name="Total" radius={[0, 3, 3, 0]}>
                        {areas.map((_, i) => <Cell key={i} fill={SERIES_CORES[i % SERIES_CORES.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* distribuição por status */}
              <div className="card an-chart-card">
                <div className="card-header"><span className="card-title">Por Status</span></div>
                {status.length === 0 ? <p className="an-empty">Sem dados</p> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={status} dataKey="total" nameKey="label" cx="50%" cy="50%" outerRadius={80} label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {status.map((s, i) => <Cell key={i} fill={STATUS_COR[s.status] ?? SERIES_CORES[i]} />)}
                      </Pie>
                      <Tooltip content={<TooltipCustom />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* top solicitantes */}
              <div className="card an-chart-card">
                <div className="card-header"><span className="card-title">Top Solicitantes</span></div>
                {solics.length === 0 ? <p className="an-empty">Sem dados</p> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={solics} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="nome" width={100} tick={{ fontSize: 11, fontFamily: 'var(--mono)', fill: C.ink }} />
                      <Tooltip content={<TooltipCustom />} />
                      <Bar dataKey="total" name="Chamados" fill={C.soft} radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* top técnicos */}
              <div className="card an-chart-card">
                <div className="card-header"><span className="card-title">Top Técnicos</span></div>
                {tecnicos.length === 0 ? <p className="an-empty">Sem dados</p> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={tecnicos} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="nome" width={100} tick={{ fontSize: 11, fontFamily: 'var(--mono)', fill: C.ink }} />
                      <Tooltip content={<TooltipCustom />} />
                      <Bar dataKey="total" name="Atendimentos" fill={C.success} radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* por prioridade */}
              <div className="card an-chart-card">
                <div className="card-header"><span className="card-title">Por Prioridade</span></div>
                {prios.length === 0 ? <p className="an-empty">Sem dados</p> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={prios} margin={{ left: 8, right: 24, bottom: 8 }}>
                      <XAxis dataKey="prioridade" tick={{ fontSize: 11, fontFamily: 'var(--mono)', fill: C.ink }} />
                      <YAxis hide />
                      <Tooltip content={<TooltipCustom />} />
                      <Bar dataKey="total" name="Chamados" radius={[3, 3, 0, 0]}>
                        {prios.map((p, i) => <Cell key={i} fill={PRIO_COR[p.prioridade] ?? SERIES_CORES[i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
