import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { api } from '../../lib/api'
import { type ModuleProps, C, SERIES_CORES } from './types'

interface CatItem   { categoria: string; total: number }
interface AtivoItem { patrimonio: string; descricao: string; total: number }
interface RankItem  { nome: string; total: number; nome_completo?: string }
interface PrioItem  { prioridade: string; total: number }

const PRIO_COR: Record<string, string> = {
  critica: C.danger, alta: '#a33', media: C.warning, baixa: C.success, normal: C.line,
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

export default function TiModule({ periodo }: ModuleProps) {
  const [prioridades, setPrioridades] = useState<PrioItem[]>([])
  const [categorias, setCategorias]   = useState<CatItem[]>([])
  const [ativos, setAtivos]           = useState<AtivoItem[]>([])
  const [secretarias, setSecretarias] = useState<RankItem[]>([])

  const carregar = useCallback(() => {
    const q = `?periodo=${periodo}`
    Promise.all([
      api.get<{ prioridades: PrioItem[] }>(`/analytics/por-prioridade${q}`),
      api.get<{ categorias: CatItem[] }>(`/analytics/ti/por-categoria${q}`),
      api.get<{ ativos: AtivoItem[] }>(`/analytics/ti/top-ativos${q}`),
      api.get<{ secretarias: RankItem[] }>(`/analytics/top-secretarias${q}`),
    ]).then(([p, c, a, s]) => {
      setPrioridades(p.prioridades)
      setCategorias(c.categorias)
      setAtivos(a.ativos)
      setSecretarias(s.secretarias)
    })
  }, [periodo])

  useEffect(() => { carregar() }, [carregar])

  return (
    <>
      <div className="an-section-title">Análise TI</div>
      <div className="an-charts-grid">

        {/* por prioridade */}
        <div className="card an-chart-card">
          <div className="card-header"><span className="card-title">Por Prioridade</span></div>
          {prioridades.length === 0 ? <p className="an-empty">Sem dados</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={prioridades} margin={{ left: 8, right: 24, bottom: 8 }}>
                <XAxis dataKey="prioridade" tick={{ fontSize: 11, fontFamily: 'var(--mono)', fill: C.ink }} />
                <YAxis hide />
                <Tooltip content={<TooltipCustom />} />
                <Bar dataKey="total" name="Chamados" radius={[3, 3, 0, 0]}>
                  {prioridades.map((p, i) => (
                    <Cell key={i} fill={PRIO_COR[p.prioridade] ?? SERIES_CORES[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* por categoria técnica */}
        <div className="card an-chart-card">
          <div className="card-header"><span className="card-title">Por Categoria Técnica</span></div>
          {categorias.length === 0 ? <p className="an-empty">Sem dados</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categorias} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="categoria" width={90} tick={{ fontSize: 11, fontFamily: 'var(--mono)', fill: C.ink }} />
                <Tooltip content={<TooltipCustom />} />
                <Bar dataKey="total" name="Chamados" radius={[0, 3, 3, 0]}>
                  {categorias.map((_, i) => <Cell key={i} fill={SERIES_CORES[i % SERIES_CORES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* top secretarias solicitantes */}
        <div className="card an-chart-card">
          <div className="card-header"><span className="card-title">Secretarias que mais Solicitam</span></div>
          {secretarias.length === 0 ? <p className="an-empty">Sem dados</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={secretarias} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 11, fontFamily: 'var(--mono)', fill: C.ink }} />
                <Tooltip content={<TooltipCustom />} formatter={(v, _, p) => [v, p.payload.nome_completo ?? p.payload.nome]} />
                <Bar dataKey="total" name="Chamados" fill={C.mid} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* top ativos com mais chamados */}
        <div className="card an-chart-card">
          <div className="card-header"><span className="card-title">Equipamentos com Mais Chamados</span></div>
          {ativos.length === 0 ? (
            <p className="an-empty">Nenhum ativo vinculado a chamados no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ativos} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="patrimonio" width={70} tick={{ fontSize: 11, fontFamily: 'var(--mono)', fill: C.accent }} />
                <Tooltip content={<TooltipCustom />} formatter={(v, _, p) => [v, p.payload.descricao ?? p.payload.patrimonio]} />
                <Bar dataKey="total" name="Chamados" fill={C.soft} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </>
  )
}
