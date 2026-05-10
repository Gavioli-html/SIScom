import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts'
import { api } from '../../lib/api'
import { type ModuleProps, C, SERIES_CORES } from './types'

interface FormatoItem   { formato: string; total: number }
interface CanalItem     { canal: string; total: number }
interface RankItem      { nome: string; total: number; nome_completo?: string }

const FORMATO_COR: Record<string, string> = {
  'Arte para redes sociais':   C.accent,
  'Cobertura de evento':       C.success,
  'Redação de nota/release':   C.warning,
  'Impresso/banner':           C.soft,
}

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

// Label curto para o gráfico de formatos
function formatoCurto(f: string) {
  return f
    .replace('Arte para redes sociais', 'Arte / Redes')
    .replace('Cobertura de evento', 'Cobertura')
    .replace('Redação de nota/release', 'Redação')
    .replace('Impresso/banner', 'Impresso')
}

export default function SecomModule({ periodo }: ModuleProps) {
  const [formatos, setFormatos]       = useState<FormatoItem[]>([])
  const [canais, setCanais]           = useState<CanalItem[]>([])
  const [secretarias, setSecretarias] = useState<RankItem[]>([])

  const carregar = useCallback(() => {
    const q = `?periodo=${periodo}`
    Promise.all([
      api.get<{ formatos: FormatoItem[] }>(`/analytics/secom/por-formato${q}`),
      api.get<{ canais: CanalItem[] }>(`/analytics/secom/por-canal${q}`),
      api.get<{ secretarias: RankItem[] }>(`/analytics/top-secretarias${q}`),
    ]).then(([f, c, s]) => {
      setFormatos(f.formatos)
      setCanais(c.canais)
      setSecretarias(s.secretarias)
    })
  }, [periodo])

  useEffect(() => { carregar() }, [carregar])

  const formatosChart = formatos.map(f => ({ ...f, nome: formatoCurto(f.formato) }))

  return (
    <>
      <div className="an-section-title">Análise SECOM</div>
      <div className="an-charts-grid">

        {/* por formato de entrega */}
        <div className="card an-chart-card">
          <div className="card-header"><span className="card-title">Por Formato de Entrega</span></div>
          {formatosChart.length === 0 ? <p className="an-empty">Sem dados</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={formatosChart} margin={{ left: 8, right: 24, bottom: 8 }}>
                <XAxis dataKey="nome" tick={{ fontSize: 10, fontFamily: 'var(--mono)', fill: C.ink }} />
                <YAxis hide />
                <Tooltip content={<TooltipCustom />} formatter={(v, _, p) => [v, p.payload.formato]} />
                <Bar dataKey="total" name="Demandas" radius={[3, 3, 0, 0]}>
                  {formatosChart.map((f, i) => (
                    <Cell key={i} fill={FORMATO_COR[f.formato] ?? SERIES_CORES[i % SERIES_CORES.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* por canal de publicação */}
        <div className="card an-chart-card">
          <div className="card-header"><span className="card-title">Por Canal de Publicação</span></div>
          {canais.length === 0 ? <p className="an-empty">Sem dados</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={canais}
                  dataKey="total"
                  nameKey="canal"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {canais.map((_, i) => (
                    <Cell key={i} fill={SERIES_CORES[i % SERIES_CORES.length]} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipCustom />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* secretarias que mais solicitam */}
        <div className="card an-chart-card">
          <div className="card-header"><span className="card-title">Secretarias que mais Solicitam</span></div>
          {secretarias.length === 0 ? <p className="an-empty">Sem dados</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={secretarias} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 11, fontFamily: 'var(--mono)', fill: C.ink }} />
                <Tooltip content={<TooltipCustom />} formatter={(v, _, p) => [v, p.payload.nome_completo ?? p.payload.nome]} />
                <Bar dataKey="total" name="Demandas" fill={C.success} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </>
  )
}
