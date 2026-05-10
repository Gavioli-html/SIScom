import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/authenticate.js'

function periodoInicio(periodo: string): Date {
  const dias = periodo === '7d' ? 7 : periodo === '90d' ? 90 : 30
  const d = new Date()
  d.setDate(d.getDate() - dias)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function analyticsRoutes(app: FastifyInstance) {

  // GET /analytics/resumo
  app.get('/analytics/resumo', { preHandler: [authenticate, requireRole('gestor', 'admin')] }, async (req) => {
    const { periodo = '30d' } = req.query as Record<string, string>
    const { area_id } = req.user
    const inicio = periodoInicio(periodo)
    const agora = new Date()

    const areaFilter = { area_id }

    const [total, resolvidos, vencidos, emAberto] = await Promise.all([
      prisma.chamado.count({ where: { ...areaFilter, aberto_em: { gte: inicio } } }),
      prisma.chamado.count({ where: { ...areaFilter, status: { in: ['RESOLVIDO', 'ENCERRADO'] }, fechado_em: { gte: inicio } } }),
      prisma.chamado.count({ where: { ...areaFilter, status: { notIn: ['RESOLVIDO', 'ENCERRADO', 'CANCELADO'] }, sla_prazo: { lt: agora } } }),
      prisma.chamado.count({ where: { ...areaFilter, status: { notIn: ['RESOLVIDO', 'ENCERRADO', 'CANCELADO'] } } }),
    ])

    const taxaSla = total > 0 ? Math.round((resolvidos / total) * 100) : 0

    return { resumo: { total, resolvidos, vencidos, em_aberto: emAberto, taxa_sla: taxaSla } }
  })

  // GET /analytics/top-areas — dados da própria área do admin
  app.get('/analytics/top-areas', { preHandler: [authenticate, requireRole('admin')] }, async (req) => {
    const { periodo = '30d' } = req.query as Record<string, string>
    const { area_id } = req.user
    const inicio = periodoInicio(periodo)

    const area = await prisma.area.findUnique({
      where: { id: area_id },
      select: {
        nome: true,
        chamados: {
          where: { aberto_em: { gte: inicio } },
          select: { status: true },
        },
      },
    })

    if (!area) return { areas: [] }

    const data = [{
      nome: area.nome,
      total: area.chamados.length,
      resolvidos: area.chamados.filter(c => ['RESOLVIDO', 'ENCERRADO'].includes(c.status)).length,
      abertos: area.chamados.filter(c => !['RESOLVIDO', 'ENCERRADO', 'CANCELADO'].includes(c.status)).length,
    }]

    return { areas: data }
  })

  // GET /analytics/top-solicitantes
  app.get('/analytics/top-solicitantes', { preHandler: [authenticate, requireRole('gestor', 'admin')] }, async (req) => {
    const { periodo = '30d' } = req.query as Record<string, string>
    const { area_id } = req.user
    const inicio = periodoInicio(periodo)
    const areaFilter = { area_id }

    const chamados = await prisma.chamado.groupBy({
      by: ['solicitante_id'],
      where: { ...areaFilter, aberto_em: { gte: inicio } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    const ids = chamados.map(c => c.solicitante_id)
    const usuarios = await prisma.usuario.findMany({
      where: { id: { in: ids } },
      select: { id: true, nome: true },
    })
    const nomeMap = Object.fromEntries(usuarios.map(u => [u.id, u.nome]))

    const data = chamados.map(c => ({
      nome: nomeMap[c.solicitante_id] ?? '—',
      total: c._count.id,
    }))

    return { solicitantes: data }
  })

  // GET /analytics/top-tecnicos
  app.get('/analytics/top-tecnicos', { preHandler: [authenticate, requireRole('gestor', 'admin')] }, async (req) => {
    const { periodo = '30d' } = req.query as Record<string, string>
    const { area_id } = req.user
    const inicio = periodoInicio(periodo)
    const areaFilter = { area_id }

    const rows = await prisma.chamadoTecnico.groupBy({
      by: ['tecnico_id'],
      where: { chamado: { ...areaFilter, aberto_em: { gte: inicio } } },
      _count: { tecnico_id: true },
      orderBy: { _count: { tecnico_id: 'desc' } },
      take: 10,
    })

    const ids = rows.map(r => r.tecnico_id)
    const usuarios = await prisma.usuario.findMany({
      where: { id: { in: ids } },
      select: { id: true, nome: true },
    })
    const nomeMap = Object.fromEntries(usuarios.map(u => [u.id, u.nome]))

    const data = rows.map(r => ({
      nome: nomeMap[r.tecnico_id] ?? '—',
      total: r._count.tecnico_id,
    }))

    return { tecnicos: data }
  })

  // GET /analytics/por-status
  app.get('/analytics/por-status', { preHandler: [authenticate, requireRole('gestor', 'admin')] }, async (req) => {
    const { periodo = '30d' } = req.query as Record<string, string>
    const { area_id } = req.user
    const inicio = periodoInicio(periodo)
    const areaFilter = { area_id }

    const grupos = await prisma.chamado.groupBy({
      by: ['status'],
      where: { ...areaFilter, aberto_em: { gte: inicio } },
      _count: { id: true },
    })

    const STATUS_LABEL: Record<string, string> = {
      ABERTO: 'Aberto', EM_ANALISE: 'Em Análise', ATRIBUIDO: 'Atribuído',
      EM_ANDAMENTO: 'Em Andamento', RESOLVIDO: 'Resolvido',
      ENCERRADO: 'Encerrado', CANCELADO: 'Cancelado',
    }

    const data = grupos.map(g => ({
      status: g.status,
      label: STATUS_LABEL[g.status] ?? g.status,
      total: g._count.id,
    }))

    return { status: data }
  })

  // GET /analytics/por-prioridade
  app.get('/analytics/por-prioridade', { preHandler: [authenticate, requireRole('gestor', 'admin')] }, async (req) => {
    const { periodo = '30d' } = req.query as Record<string, string>
    const { area_id } = req.user
    const inicio = periodoInicio(periodo)
    const areaFilter = { area_id }

    const grupos = await prisma.chamado.groupBy({
      by: ['prioridade'],
      where: { ...areaFilter, aberto_em: { gte: inicio } },
      _count: { id: true },
    })

    const data = grupos
      .map(g => ({ prioridade: g.prioridade, total: g._count.id }))
      .sort((a, b) => b.total - a.total)

    return { prioridades: data }
  })

  // GET /analytics/top-secretarias
  app.get('/analytics/top-secretarias', { preHandler: [authenticate, requireRole('gestor', 'admin')] }, async (req) => {
    const { periodo = '30d' } = req.query as Record<string, string>
    const { area_id } = req.user
    const inicio = periodoInicio(periodo)
    const areaFilter = { area_id }

    const grupos = await prisma.chamado.groupBy({
      by: ['secretaria_solicitante'],
      where: {
        ...areaFilter,
        aberto_em: { gte: inicio },
        secretaria_solicitante: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    const data = grupos
      .filter(g => g.secretaria_solicitante)
      .map(g => ({
        nome: g.secretaria_solicitante!
          .replace('Secretaria Municipal de ', '')
          .replace('Secretaria Municipal do ', ''),
        nome_completo: g.secretaria_solicitante!,
        total: g._count.id,
      }))

    return { secretarias: data }
  })

  // ── Módulo TI ────────────────────────────────────────────────────────────

  // GET /analytics/ti/por-categoria — agrupa por campo "categoria" do template TI
  app.get('/analytics/ti/por-categoria', { preHandler: [authenticate, requireRole('gestor', 'admin')] }, async (req) => {
    const { periodo = '30d' } = req.query as Record<string, string>
    const { area_id } = req.user
    const inicio = periodoInicio(periodo)

    const grupos = await prisma.campoChamado.groupBy({
      by: ['valor'],
      where: {
        chave: 'categoria',
        chamado: { area_id, aberto_em: { gte: inicio } },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })

    return { categorias: grupos.map(g => ({ categoria: g.valor, total: g._count.id })) }
  })

  // GET /analytics/ti/top-ativos — equipamentos que mais geram chamados
  app.get('/analytics/ti/top-ativos', { preHandler: [authenticate, requireRole('gestor', 'admin')] }, async (req) => {
    const { periodo = '30d' } = req.query as Record<string, string>
    const { area_id } = req.user
    const inicio = periodoInicio(periodo)

    const rows = await prisma.chamadoAtivo.groupBy({
      by: ['ativo_id'],
      where: { chamado: { area_id, aberto_em: { gte: inicio } } },
      _count: { ativo_id: true },
      orderBy: { _count: { ativo_id: 'desc' } },
      take: 10,
    })

    const ids = rows.map(r => r.ativo_id)
    const ativos = await prisma.ativo.findMany({
      where: { id: { in: ids } },
      select: { id: true, patrimonio: true, descricao: true, tipo: true },
    })
    const ativoMap = Object.fromEntries(ativos.map(a => [a.id, a]))

    return {
      ativos: rows.map(r => ({
        patrimonio: ativoMap[r.ativo_id]?.patrimonio ?? `#${r.ativo_id}`,
        descricao: ativoMap[r.ativo_id]?.descricao ?? ativoMap[r.ativo_id]?.tipo ?? '—',
        total: r._count.ativo_id,
      })),
    }
  })

  // ── Módulo SECOM ─────────────────────────────────────────────────────────

  // GET /analytics/secom/por-formato — distribuição por formato de entrega (multiselect)
  app.get('/analytics/secom/por-formato', { preHandler: [authenticate, requireRole('gestor', 'admin')] }, async (req) => {
    const { periodo = '30d' } = req.query as Record<string, string>
    const { area_id } = req.user
    const inicio = periodoInicio(periodo)

    const campos = await prisma.campoChamado.findMany({
      where: { chave: 'formato', chamado: { area_id, aberto_em: { gte: inicio } } },
      select: { valor: true },
    })

    const contagem: Record<string, number> = {}
    for (const { valor } of campos) {
      for (const item of valor.split(',').map(s => s.trim()).filter(Boolean)) {
        contagem[item] = (contagem[item] ?? 0) + 1
      }
    }

    const formatos = Object.entries(contagem)
      .map(([formato, total]) => ({ formato, total }))
      .sort((a, b) => b.total - a.total)

    return { formatos }
  })

  // GET /analytics/secom/por-canal — distribuição por canal de publicação (multiselect)
  app.get('/analytics/secom/por-canal', { preHandler: [authenticate, requireRole('gestor', 'admin')] }, async (req) => {
    const { periodo = '30d' } = req.query as Record<string, string>
    const { area_id } = req.user
    const inicio = periodoInicio(periodo)

    const campos = await prisma.campoChamado.findMany({
      where: { chave: 'canal', chamado: { area_id, aberto_em: { gte: inicio } } },
      select: { valor: true },
    })

    const contagem: Record<string, number> = {}
    for (const { valor } of campos) {
      for (const item of valor.split(',').map(s => s.trim()).filter(Boolean)) {
        contagem[item] = (contagem[item] ?? 0) + 1
      }
    }

    const canais = Object.entries(contagem)
      .map(([canal, total]) => ({ canal, total }))
      .sort((a, b) => b.total - a.total)

    return { canais }
  })

  // GET /analytics/alertas
  app.get('/analytics/alertas', { preHandler: [authenticate, requireRole('gestor', 'admin')] }, async (req) => {
    const { area_id } = req.user
    const agora = new Date()
    const areaFilter = { area_id }

    const [vencidos, criticos, semAtividade] = await Promise.all([
      prisma.chamado.count({
        where: { ...areaFilter, status: { notIn: ['RESOLVIDO', 'ENCERRADO', 'CANCELADO'] }, sla_prazo: { lt: agora } },
      }),
      prisma.chamado.count({
        where: { ...areaFilter, prioridade: 'critica', status: { notIn: ['RESOLVIDO', 'ENCERRADO', 'CANCELADO'] } },
      }),
      prisma.chamado.count({
        where: { ...areaFilter, aberto_em: { gte: new Date(agora.getTime() - 7 * 86400000) } },
      }),
    ])

    const alertas = []

    if (vencidos > 0) {
      alertas.push({
        tipo: 'danger',
        titulo: 'SLA vencido',
        mensagem: `${vencidos} chamado${vencidos > 1 ? 's' : ''} com prazo expirado`,
      })
    }
    if (criticos > 0) {
      alertas.push({
        tipo: 'danger',
        titulo: 'Chamados críticos em aberto',
        mensagem: `${criticos} chamado${criticos > 1 ? 's' : ''} com prioridade crítica`,
      })
    }
    if (semAtividade === 0) {
      alertas.push({
        tipo: 'info',
        titulo: 'Sem novos chamados',
        mensagem: 'Nenhum chamado aberto nos últimos 7 dias',
      })
    }
    if (vencidos === 0 && criticos === 0) {
      alertas.push({
        tipo: 'success',
        titulo: 'Tudo em dia',
        mensagem: 'Nenhum SLA vencido e nenhum chamado crítico em aberto',
      })
    }

    return { alertas }
  })
}
