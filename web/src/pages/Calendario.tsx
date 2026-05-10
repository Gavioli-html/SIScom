import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { api } from '../lib/api'
import './Calendario.css'

interface Chamado {
  id: number
  protocolo: string
  titulo: string
  status: string
  prioridade: string
  sla_prazo: string | null
  aberto_em: string
  solicitante: { nome: string }
  tecnicos: { tecnico: { nome: string } }[]
}

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const PRIO_COR: Record<string, string> = {
  critica: 'cal-prio-critica',
  alta:    'cal-prio-alta',
  media:   'cal-prio-media',
  baixa:   'cal-prio-baixa',
  normal:  'cal-prio-normal',
}

const STATUS_ENCERRADO = ['RESOLVIDO', 'ENCERRADO', 'CANCELADO']

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function inicioMes(ano: number, mes: number) {
  return new Date(ano, mes, 1)
}

function fimMes(ano: number, mes: number) {
  return new Date(ano, mes + 1, 0, 23, 59, 59)
}

// Retorna offset de segunda-feira (0=Seg, 6=Dom)
function offsetSegunda(data: Date) {
  return (data.getDay() + 6) % 7
}

export default function Calendario() {
  const hoje = new Date()
  const [ano, setAno]   = useState(hoje.getFullYear())
  const [mes, setMes]   = useState(hoje.getMonth())
  const [chamados, setChamados] = useState<Chamado[]>([])
  const [loading, setLoading]   = useState(true)
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)

  const carregarMes = useCallback(() => {
    setLoading(true)
    const inicio = inicioMes(ano, mes)
    const fim    = fimMes(ano, mes)
    const params = new URLSearchParams({
      prazo_inicio: inicio.toISOString(),
      prazo_fim:    fim.toISOString(),
    })
    api.get<{ chamados: Chamado[] }>(`/chamados?${params}`)
      .then(d => setChamados(d.chamados))
      .finally(() => setLoading(false))
  }, [ano, mes])

  useEffect(() => { carregarMes() }, [carregarMes])

  // Agrupa chamados por dia (YYYY-MM-DD do sla_prazo)
  const porDia = chamados.reduce<Record<string, Chamado[]>>((acc, c) => {
    if (!c.sla_prazo) return acc
    const dia = isoDate(new Date(c.sla_prazo))
    acc[dia] = acc[dia] ? [...acc[dia], c] : [c]
    return acc
  }, {})

  // Células do grid
  const primeiroDia  = inicioMes(ano, mes)
  const totalDias    = fimMes(ano, mes).getDate()
  const offsetInicio = offsetSegunda(primeiroDia)
  const celulas: (number | null)[] = [
    ...Array(offsetInicio).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ]
  // Completar até múltiplo de 7
  while (celulas.length % 7 !== 0) celulas.push(null)

  const navMes = (delta: number) => {
    const d = new Date(ano, mes + delta, 1)
    setAno(d.getFullYear())
    setMes(d.getMonth())
    setDiaSelecionado(null)
  }

  const nomeMes = primeiroDia.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  const hojeStr = isoDate(hoje)

  const chamadosDia = diaSelecionado ? (porDia[diaSelecionado] ?? []) : []

  // Contadores do mês
  const total     = chamados.length
  const vencidos  = chamados.filter(c => c.sla_prazo && new Date(c.sla_prazo) < hoje && !STATUS_ENCERRADO.includes(c.status)).length
  const encerrados = chamados.filter(c => STATUS_ENCERRADO.includes(c.status)).length

  return (
    <AppShell>
      <div className="cal-page">

        <div className="cal-header">
          <h1 className="page-title">Calendário</h1>
          <div className="cal-nav">
            <button className="cal-nav-btn" onClick={() => navMes(-1)}>‹</button>
            <span className="cal-mes-label">{nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}</span>
            <button className="cal-nav-btn" onClick={() => navMes(1)}>›</button>
            <button className="cal-hoje-btn" onClick={() => { setAno(hoje.getFullYear()); setMes(hoje.getMonth()); setDiaSelecionado(hojeStr) }}>
              Hoje
            </button>
          </div>
        </div>

        {/* resumo do mês */}
        <div className="cal-resumo">
          <div className="cal-resumo-item">
            <span className="cal-resumo-num">{total}</span>
            <span className="cal-resumo-label">com prazo no mês</span>
          </div>
          <div className="cal-resumo-item">
            <span className="cal-resumo-num" style={{ color: vencidos ? 'var(--sem-danger)' : 'var(--sem-success)' }}>{vencidos}</span>
            <span className="cal-resumo-label">vencidos em aberto</span>
          </div>
          <div className="cal-resumo-item">
            <span className="cal-resumo-num" style={{ color: 'var(--sem-success)' }}>{encerrados}</span>
            <span className="cal-resumo-label">encerrados</span>
          </div>
        </div>

        <div className="cal-layout">
          {/* grade do calendário */}
          <div className="cal-grid-wrap card">
            {loading && <div className="cal-loading">Carregando...</div>}

            <div className="cal-grid">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="cal-dia-semana">{d}</div>
              ))}

              {celulas.map((dia, i) => {
                if (dia === null) return <div key={`vazio-${i}`} className="cal-celula cal-celula--vazia" />

                const chave = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
                const eventos = porDia[chave] ?? []
                const isHoje = chave === hojeStr
                const isSelecionado = chave === diaSelecionado
                const temVencido = eventos.some(c => !STATUS_ENCERRADO.includes(c.status))

                return (
                  <div
                    key={chave}
                    className={[
                      'cal-celula',
                      isHoje ? 'cal-celula--hoje' : '',
                      isSelecionado ? 'cal-celula--selecionada' : '',
                      eventos.length > 0 ? 'cal-celula--com-eventos' : '',
                    ].join(' ')}
                    onClick={() => setDiaSelecionado(isSelecionado ? null : chave)}
                  >
                    <span className="cal-num-dia">{dia}</span>
                    <div className="cal-eventos">
                      {eventos.slice(0, 3).map(c => (
                        <span
                          key={c.id}
                          className={`cal-evento ${PRIO_COR[c.prioridade] ?? 'cal-prio-normal'} ${STATUS_ENCERRADO.includes(c.status) ? 'cal-evento--encerrado' : ''}`}
                          title={`${c.protocolo} · ${c.titulo}`}
                        >
                          {c.titulo}
                        </span>
                      ))}
                      {eventos.length > 3 && (
                        <span className="cal-mais">+{eventos.length - 3} mais</span>
                      )}
                    </div>
                    {eventos.length > 0 && temVencido && (
                      <span className="cal-dot" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* painel lateral do dia selecionado */}
          {diaSelecionado && (
            <div className="cal-painel card">
              <div className="card-header">
                <span className="card-title">
                  {new Date(diaSelecionado + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>

              {chamadosDia.length === 0 ? (
                <p className="cal-painel-vazio">Nenhum chamado com prazo neste dia.</p>
              ) : (
                <div className="cal-painel-lista">
                  {chamadosDia.map(c => (
                    <Link key={c.id} to={`/chamados/${c.id}`} className="cal-painel-item">
                      <div className="cal-painel-item-top">
                        <span className={`cal-evento-dot ${PRIO_COR[c.prioridade] ?? 'cal-prio-normal'}`} />
                        <span className="cal-painel-proto">{c.protocolo}</span>
                        {STATUS_ENCERRADO.includes(c.status) && (
                          <span className="cal-painel-encerrado">✓</span>
                        )}
                      </div>
                      <p className="cal-painel-titulo">{c.titulo}</p>
                      <p className="cal-painel-meta">
                        {c.tecnicos.length > 0 ? `Técnico: ${c.tecnicos.map(t => t.tecnico.nome).join(', ')}` : 'Sem técnico'}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* legenda */}
        <div className="cal-legenda">
          {(['critica', 'alta', 'media', 'baixa', 'normal'] as const).map(p => (
            <span key={p} className="cal-legenda-item">
              <span className={`cal-evento-dot ${PRIO_COR[p]}`} />
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </span>
          ))}
        </div>

      </div>
    </AppShell>
  )
}
