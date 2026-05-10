import { useEffect, useState, useCallback, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from 'recharts'
import AppShell from '../components/layout/AppShell'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { getModule } from './analytics/moduleRegistry'
import { C, SERIES_CORES } from './analytics/types'
import './Analytics.css'

/* ── tipos ──────────────────────────────────────────── */
interface Resumo    { total: number; resolvidos: number; vencidos: number; em_aberto: number; taxa_sla: number }
interface RankItem  { nome: string; total: number; nome_completo?: string }
interface StatusItem { status: string; label: string; total: number }
interface Alerta    { tipo: string; titulo: string; mensagem: string }

const STATUS_COR: Record<string, string> = {
  ABERTO: C.line, EM_ANALISE: C.warning, ATRIBUIDO: C.soft,
  EM_ANDAMENTO: C.accent, RESOLVIDO: C.success, ENCERRADO: C.success, CANCELADO: C.danger,
}

const PERIODOS = [{ v: '7d', l: '7 dias' }, { v: '30d', l: '30 dias' }, { v: '90d', l: '90 dias' }]

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

/* ── contador animado ────────────────────────────────── */
function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return value
}

function MetricCard({ label, value, color, delay = 0 }: { label: string; value: number; color?: string; delay?: number }) {
  const animated = useCountUp(value)
  return (
    <div className="an-card" style={{ animationDelay: `${delay}ms` }}>
      <span className="an-card-label">{label}</span>
      <span className="an-card-value" style={color ? { color } : {}}>{animated}</span>
    </div>
  )
}

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

/* ── página ──────────────────────────────────────────── */
export default function Analytics() {
  const { usuario } = useAuth()
  const [periodo, setPeriodo] = useState('30d')

  const [resumo, setResumo]   = useState<Resumo | null>(null)
  const [solics, setSolics]   = useState<RankItem[]>([])
  const [tecnicos, setTecnicos] = useState<RankItem[]>([])
  const [status, setStatus]   = useState<StatusItem[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)

  const AreaModule = getModule(usuario?.area.slug ?? '')

  const carregar = useCallback(() => {
    setLoading(true)
    const q = `?periodo=${periodo}`
    Promise.all([
      api.get<{ resumo: Resumo }>(`/analytics/resumo${q}`),
      api.get<{ solicitantes: RankItem[] }>(`/analytics/top-solicitantes${q}`),
      api.get<{ tecnicos: RankItem[] }>(`/analytics/top-tecnicos${q}`),
      api.get<{ status: StatusItem[] }>(`/analytics/por-status${q}`),
      api.get<{ alertas: Alerta[] }>('/analytics/alertas'),
    ]).then(([r, s, t, st, al]) => {
      setResumo(r.resumo)
      setSolics(s.solicitantes)
      setTecnicos(t.tecnicos)
      setStatus(st.status)
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
          <div className="an-loading">
            {[...Array(5)].map((_, i) => <div key={i} className="an-skeleton" />)}
            {[...Array(2)].map((_, i) => <div key={i} className="an-skeleton an-skeleton--chart" />)}
          </div>
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

            {/* métricas compartilhadas */}
            <div className="an-cards" key={periodo}>
              <MetricCard label="Total de chamados" value={resumo?.total ?? 0}      delay={0} />
              <MetricCard label="Em aberto"          value={resumo?.em_aberto ?? 0}  color={C.accent}  delay={60} />
              <MetricCard label="Resolvidos"         value={resumo?.resolvidos ?? 0} color={C.success} delay={120} />
              <MetricCard label="SLA vencidos"       value={resumo?.vencidos ?? 0}   color={resumo?.vencidos ? C.danger : C.success} delay={180} />
              <div className="an-card an-card--gauge" style={{ animationDelay: '240ms' }}>
                <span className="an-card-label">Taxa de SLA</span>
                <GaugeCard taxa={resumo?.taxa_sla ?? 0} />
              </div>
            </div>

            {/* seção geral compartilhada */}
            <div className="an-section-title">Visão Geral</div>
            <div className="an-charts-grid" key={`${periodo}-shared`}>

              <div className="card an-chart-card">
                <div className="card-header"><span className="card-title">Por Status</span></div>
                {status.length === 0 ? <p className="an-empty">Sem dados</p> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={status} dataKey="total" nameKey="label" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {status.map((s, i) => <Cell key={i} fill={STATUS_COR[s.status] ?? SERIES_CORES[i]} />)}
                      </Pie>
                      <Tooltip content={<TooltipCustom />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

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

            </div>

            {/* módulo específico da área */}
            {AreaModule && <AreaModule periodo={periodo} />}
          </>
        )}
      </div>
    </AppShell>
  )
}
