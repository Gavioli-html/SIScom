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
    const { periodo = '30d', area_id: qArea } = req.query as Record<string, string>
    const { area_id, role } = req.user
    const inicio = periodoInicio(periodo)
    const agora = new Date()

    const areaFilter = role === 'admin' && qArea
      ? { area_id: Number(qArea) }
      : role !== 'admin'
        ? { area_id }
        : {}

    const [total, resolvidos, vencidos, emAberto] = await Promise.all([
      prisma.chamado.count({ where: { ...areaFilter, aberto_em: { gte: inicio } } }),
      prisma.chamado.count({ where: { ...areaFilter, status: { in: ['RESOLVIDO', 'ENCERRADO'] }, fechado_em: { gte: inicio } } }),
      prisma.chamado.count({ where: { ...areaFilter, status: { notIn: ['RESOLVIDO', 'ENCERRADO', 'CANCELADO'] }, sla_prazo: { lt: agora } } }),
      prisma.chamado.count({ where: { ...areaFilter, status: { notIn: ['RESOLVIDO', 'ENCERRADO', 'CANCELADO'] } } }),
    ])

    const taxaSla = total > 0 ? Math.round((resolvidos / total) * 100) : 0

    return { resumo: { total, resolvidos, vencidos, em_aberto: emAberto, taxa_sla: taxaSla } }
  })

  // GET /analytics/top-areas
  app.get('/analytics/top-areas', { preHandler: [authenticate, requireRole('gestor', 'admin')] }, async (req) => {
    const { periodo = '30d' } = req.query as Record<string, string>
    const inicio = periodoInicio(periodo)

    const areas = await prisma.area.findMany({
      select: {
        nome: true,
        chamados: {
          where: { aberto_em: { gte: inicio } },
          select: { status: true },
        },
      },
    })

    const data = areas
      .map(a => ({
        nome: a.nome,
        total: a.chamados.length,
        resolvidos: a.chamados.filter(c => ['RESOLVIDO', 'ENCERRADO'].includes(c.status)).length,
        abertos: a.chamados.filter(c => !['RESOLVIDO', 'ENCERRADO', 'CANCELADO'].includes(c.status)).length,
      }))
      .filter(a => a.total > 0)
      .sort((a, b) => b.total - a.total)

    return { areas: data }
  })

  // GET /analytics/top-solicitantes
  app.get('/analytics/top-solicitantes', { preHandler: [authenticate, requireRole('gestor', 'admin')] }, async (req) => {
    const { periodo = '30d', area_id: qArea } = req.query as Record<string, string>
    const { area_id, role } = req.user
    const inicio = periodoInicio(periodo)
    const areaFilter = role === 'admin' && qArea ? { area_id: Number(qArea) } : role !== 'admin' ? { area_id } : {}

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
    const { periodo = '30d', area_id: qArea } = req.query as Record<string, string>
    const { area_id, role } = req.user
    const inicio = periodoInicio(periodo)
    const areaFilter = role === 'admin' && qArea ? { area_id: Number(qArea) } : role !== 'admin' ? { area_id } : {}

    const chamados = await prisma.chamado.groupBy({
      by: ['tecnico_id'],
      where: { ...areaFilter, aberto_em: { gte: inicio }, tecnico_id: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    const ids = chamados.map(c => c.tecnico_id).filter(Boolean) as number[]
    const usuarios = await prisma.usuario.findMany({
      where: { id: { in: ids } },
      select: { id: true, nome: true },
    })
    const nomeMap = Object.fromEntries(usuarios.map(u => [u.id, u.nome]))

    const data = chamados.map(c => ({
      nome: nomeMap[c.tecnico_id!] ?? '—',
      total: c._count.id,
    }))

    return { tecnicos: data }
  })

  // GET /analytics/por-status
  app.get('/analytics/por-status', { preHandler: [authenticate, requireRole('gestor', 'admin')] }, async (req) => {
    const { periodo = '30d', area_id: qArea } = req.query as Record<string, string>
    const { area_id, role } = req.user
    const inicio = periodoInicio(periodo)
    const areaFilter = role === 'admin' && qArea ? { area_id: Number(qArea) } : role !== 'admin' ? { area_id } : {}

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
    const { periodo = '30d', area_id: qArea } = req.query as Record<string, string>
    const { area_id, role } = req.user
    const inicio = periodoInicio(periodo)
    const areaFilter = role === 'admin' && qArea ? { area_id: Number(qArea) } : role !== 'admin' ? { area_id } : {}

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

  // GET /analytics/alertas
  app.get('/analytics/alertas', { preHandler: [authenticate, requireRole('gestor', 'admin')] }, async (req) => {
    const { area_id, role } = req.user
    const agora = new Date()
    const areaFilter = role !== 'admin' ? { area_id } : {}

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
