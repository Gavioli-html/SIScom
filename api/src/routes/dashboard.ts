import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/authenticate.js'

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/dashboard', { preHandler: authenticate }, async (req) => {
    const { area_id } = req.user

    const areaFilter = { area_id }

    const agora = new Date()
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)

    const [
      totalAbertos,
      totalEmAndamento,
      resolvidosMes,
      vencidos,
      urgentes,
    ] = await Promise.all([
      prisma.chamado.count({
        where: { ...areaFilter, status: { in: ['ABERTO', 'EM_ANALISE', 'ATRIBUIDO'] } },
      }),
      prisma.chamado.count({
        where: { ...areaFilter, status: 'EM_ANDAMENTO' },
      }),
      prisma.chamado.count({
        where: {
          ...areaFilter,
          status: { in: ['RESOLVIDO', 'ENCERRADO'] },
          fechado_em: { gte: inicioMes },
        },
      }),
      prisma.chamado.count({
        where: {
          ...areaFilter,
          status: { notIn: ['RESOLVIDO', 'ENCERRADO', 'CANCELADO'] },
          sla_prazo: { lt: agora },
        },
      }),
      prisma.chamado.findMany({
        where: {
          ...areaFilter,
          status: { notIn: ['RESOLVIDO', 'ENCERRADO', 'CANCELADO'] },
          sla_prazo: { not: null },
        },
        orderBy: { sla_prazo: 'asc' },
        take: 5,
        select: {
          id: true,
          protocolo: true,
          titulo: true,
          status: true,
          prioridade: true,
          sla_prazo: true,
          area: { select: { nome: true } },
          tecnicos: { select: { tecnico: { select: { nome: true } } } },
        },
      }),
    ])

    const area = await prisma.area.findUnique({
      where: { id: area_id },
      select: { config_json: true },
    })
    const config = (area?.config_json ?? {}) as Record<string, unknown>

    return {
      metricas: {
        abertos: totalAbertos,
        em_andamento: totalEmAndamento,
        resolvidos_mes: resolvidosMes,
        vencidos,
      },
      urgentes,
      anotacao: (config.anotacao as string | null) ?? null,
    }
  })

  // GET /anotacao — lê anotação da área
  app.get('/anotacao', { preHandler: authenticate }, async (req) => {
    const { area_id } = req.user
    const area = await prisma.area.findUnique({
      where: { id: area_id },
      select: { config_json: true },
    })
    const config = (area?.config_json ?? {}) as Record<string, unknown>
    return { anotacao: (config.anotacao as string | null) ?? null }
  })

  // PATCH /anotacao — salva anotação (admin only)
  app.patch('/anotacao', { preHandler: [authenticate, requireRole('admin')] }, async (req) => {
    const { area_id } = req.user
    const { conteudo } = req.body as { conteudo: string }

    const area = await prisma.area.findUnique({
      where: { id: area_id },
      select: { config_json: true },
    })
    const config = { ...((area?.config_json ?? {}) as Record<string, unknown>), anotacao: conteudo ?? null }

    await prisma.area.update({
      where: { id: area_id },
      data: { config_json: config as never },
    })

    return { anotacao: config.anotacao }
  })
}
