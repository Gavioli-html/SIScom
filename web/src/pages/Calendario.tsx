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

interface Evento {
  id: number
  titulo: string
  data: string
  cor: string
  descricao: string | null
  criado_por: { id: number; nome: string }
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

const CORES_EVENTO: { valor: string; css: string; label: string }[] = [
  { valor: 'accent',  css: 'var(--accent)',      label: 'Azul'    },
  { valor: 'success', css: 'var(--sem-success)',  label: 'Verde'   },
  { valor: 'warning', css: 'var(--sem-warning)',  label: 'Amarelo' },
  { valor: 'danger',  css: 'var(--sem-danger)',   label: 'Vermelho'},
  { valor: 'violet',  css: 'var(--ink-soft)',     label: 'Roxo'    },
]

function corEventoCss(cor: string): string {
  return CORES_EVENTO.find(c => c.valor === cor)?.css ?? 'var(--accent)'
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function inicioMes(ano: number, mes: number) {
  return new Date(ano, mes, 1)
}

function fimMes(ano: number, mes: number) {
  return new Date(ano, mes + 1, 0, 23, 59, 59)
}

function offsetSegunda(data: Date) {
  return (data.getDay() + 6) % 7
}

export default function Calendario() {
  const hoje = new Date()
  const [ano, setAno]   = useState(hoje.getFullYear())
  const [mes, setMes]   = useState(hoje.getMonth())
  const [chamados, setChamados]     = useState<Chamado[]>([])
  const [eventos, setEventos]       = useState<Evento[]>([])
  const [loading, setLoading]       = useState(true)
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)

  // form novo evento
  const [novoTitulo, setNovoTitulo]   = useState('')
  const [novaCor, setNovaCor]         = useState('accent')
  const [novaDesc, setNovaDesc]       = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [formAberto, setFormAberto]   = useState(false)

  const carregarMes = useCallback(() => {
    setLoading(true)
    const inicio = inicioMes(ano, mes)
    const fim    = fimMes(ano, mes)
    const params = new URLSearchParams({
      prazo_inicio: inicio.toISOString(),
      prazo_fim:    fim.toISOString(),
    })
    Promise.all([
      api.get<{ chamados: Chamado[] }>(`/chamados?${params}`),
      api.get<{ eventos: Evento[] }>(`/eventos?inicio=${inicio.toISOString()}&fim=${fim.toISOString()}`),
    ])
      .then(([c, e]) => { setChamados(c.chamados); setEventos(e.eventos) })
      .finally(() => setLoading(false))
  }, [ano, mes])

  useEffect(() => { carregarMes() }, [carregarMes])

  const porDia = chamados.reduce<Record<string, Chamado[]>>((acc, c) => {
    if (!c.sla_prazo) return acc
    const dia = isoDate(new Date(c.sla_prazo))
    acc[dia] = acc[dia] ? [...acc[dia], c] : [c]
    return acc
  }, {})

  const eventosPorDia = eventos.reduce<Record<string, Evento[]>>((acc, e) => {
    const dia = isoDate(new Date(e.data))
    acc[dia] = acc[dia] ? [...acc[dia], e] : [e]
    return acc
  }, {})

  const primeiroDia  = inicioMes(ano, mes)
  const totalDias    = fimMes(ano, mes).getDate()
  const offsetInicio = offsetSegunda(primeiroDia)
  const celulas: (number | null)[] = [
    ...Array(offsetInicio).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ]
  while (celulas.length % 7 !== 0) celulas.push(null)

  const navMes = (delta: number) => {
    const d = new Date(ano, mes + delta, 1)
    setAno(d.getFullYear())
    setMes(d.getMonth())
    setDiaSelecionado(null)
    setFormAberto(false)
  }

  const nomeMes = primeiroDia.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  const hojeStr = isoDate(hoje)

  const chamadosDia = diaSelecionado ? (porDia[diaSelecionado] ?? []) : []
  const eventosDia  = diaSelecionado ? (eventosPorDia[diaSelecionado] ?? []) : []

  const total      = chamados.length
  const vencidos   = chamados.filter(c => c.sla_prazo && new Date(c.sla_prazo) < hoje && !STATUS_ENCERRADO.includes(c.status)).length
  const encerrados = chamados.filter(c => STATUS_ENCERRADO.includes(c.status)).length

  const handleAddEvento = async () => {
    if (!novoTitulo.trim() || !diaSelecionado) return
    setAdicionando(true)
    try {
      const { evento } = await api.post<{ evento: Evento }>('/eventos', {
        titulo: novoTitulo.trim(),
        data: diaSelecionado,
        cor: novaCor,
        descricao: novaDesc.trim() || undefined,
      })
      setEventos(prev => [...prev, evento])
      setNovoTitulo('')
      setNovaDesc('')
      setNovaCor('accent')
      setFormAberto(false)
    } finally {
      setAdicionando(false)
    }
  }

  const handleDeleteEvento = async (id: number) => {
    await api.delete(`/eventos/${id}`)
    setEventos(prev => prev.filter(e => e.id !== id))
  }

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
          <div className="cal-resumo-item">
            <span className="cal-resumo-num">{eventos.length}</span>
            <span className="cal-resumo-label">eventos no mês</span>
          </div>
        </div>

        <div className="cal-layout">
          <div className="cal-grid-wrap card">
            {loading && <div className="cal-loading">Carregando...</div>}

            <div className="cal-grid">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="cal-dia-semana">{d}</div>
              ))}

              {celulas.map((dia, i) => {
                if (dia === null) return <div key={`vazio-${i}`} className="cal-celula cal-celula--vazia" />

                const chave      = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
                const chs        = porDia[chave] ?? []
                const evs        = eventosPorDia[chave] ?? []
                const isHoje     = chave === hojeStr
                const isSel      = chave === diaSelecionado
                const temVencido = chs.some(c => !STATUS_ENCERRADO.includes(c.status))

                return (
                  <div
                    key={chave}
                    className={[
                      'cal-celula',
                      isHoje ? 'cal-celula--hoje' : '',
                      isSel  ? 'cal-celula--selecionada' : '',
                      (chs.length > 0 || evs.length > 0) ? 'cal-celula--com-eventos' : '',
                    ].join(' ')}
                    onClick={() => { setDiaSelecionado(isSel ? null : chave); setFormAberto(false) }}
                  >
                    <span className="cal-num-dia">{dia}</span>
                    <div className="cal-eventos">
                      {evs.slice(0, 2).map(e => (
                        <span
                          key={`ev-${e.id}`}
                          className="cal-evento cal-evento--custom"
                          style={{ borderLeftColor: corEventoCss(e.cor), color: corEventoCss(e.cor), background: 'rgba(0,102,204,.08)' }}
                          title={e.titulo}
                        >
                          ◆ {e.titulo}
                        </span>
                      ))}
                      {chs.slice(0, Math.max(0, 3 - evs.slice(0, 2).length)).map(c => (
                        <span
                          key={c.id}
                          className={`cal-evento ${PRIO_COR[c.prioridade] ?? 'cal-prio-normal'} ${STATUS_ENCERRADO.includes(c.status) ? 'cal-evento--encerrado' : ''}`}
                          title={`${c.protocolo} · ${c.titulo}`}
                        >
                          {c.titulo}
                        </span>
                      ))}
                      {(chs.length + evs.length) > 3 && (
                        <span className="cal-mais">+{chs.length + evs.length - 3} mais</span>
                      )}
                    </div>
                    {chs.length > 0 && temVencido && (
                      <span className="cal-dot" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {diaSelecionado && (
            <div className="cal-painel card">
              <div className="card-header">
                <span className="card-title">
                  {new Date(diaSelecionado + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                <button
                  className="cal-add-btn"
                  onClick={() => setFormAberto(f => !f)}
                  title="Adicionar evento"
                >
                  {formAberto ? '×' : '+ Evento'}
                </button>
              </div>

              {formAberto && (
                <div className="cal-form-evento">
                  <input
                    className="form-input"
                    placeholder="Título do evento *"
                    value={novoTitulo}
                    onChange={e => setNovoTitulo(e.target.value)}
                    autoFocus
                  />
                  <div className="cal-cores">
                    {CORES_EVENTO.map(c => (
                      <button
                        key={c.valor}
                        type="button"
                        className={`cal-cor-chip${novaCor === c.valor ? ' cal-cor-chip--ativo' : ''}`}
                        style={{ background: c.css }}
                        title={c.label}
                        onClick={() => setNovaCor(c.valor)}
                      />
                    ))}
                  </div>
                  <textarea
                    className="form-textarea"
                    placeholder="Descrição (opcional)"
                    rows={2}
                    value={novaDesc}
                    onChange={e => setNovaDesc(e.target.value)}
                  />
                  <div className="cal-form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => { setFormAberto(false); setNovoTitulo(''); setNovaDesc('') }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={adicionando || !novoTitulo.trim()}
                      onClick={handleAddEvento}
                    >
                      {adicionando ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}

              {eventosDia.length > 0 && (
                <div className="cal-painel-secao">
                  <span className="cal-painel-secao-label">Eventos</span>
                  <div className="cal-painel-eventos">
                    {eventosDia.map(e => (
                      <div key={e.id} className="cal-painel-evento" style={{ borderLeftColor: corEventoCss(e.cor) }}>
                        <div className="cal-painel-evento-top">
                          <span className="cal-painel-evento-titulo" style={{ color: corEventoCss(e.cor) }}>
                            {e.titulo}
                          </span>
                          <button
                            className="cal-delete-btn"
                            title="Remover evento"
                            onClick={() => handleDeleteEvento(e.id)}
                          >
                            ×
                          </button>
                        </div>
                        {e.descricao && <p className="cal-painel-meta">{e.descricao}</p>}
                        <p className="cal-painel-meta">por {e.criado_por.nome}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {chamadosDia.length > 0 && (
                <div className="cal-painel-secao">
                  <span className="cal-painel-secao-label">Chamados com prazo</span>
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
                </div>
              )}

              {eventosDia.length === 0 && chamadosDia.length === 0 && !formAberto && (
                <p className="cal-painel-vazio">Nenhum evento ou chamado neste dia.<br />
                  <button className="cal-painel-vazio-btn" onClick={() => setFormAberto(true)}>+ Adicionar evento</button>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="cal-legenda">
          {(['critica', 'alta', 'media', 'baixa', 'normal'] as const).map(p => (
            <span key={p} className="cal-legenda-item">
              <span className={`cal-evento-dot ${PRIO_COR[p]}`} />
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </span>
          ))}
          <span className="cal-legenda-sep" />
          <span className="cal-legenda-item">
            <span className="cal-legenda-evento-icon">◆</span>
            Eventos
          </span>
        </div>

      </div>
    </AppShell>
  )
}
