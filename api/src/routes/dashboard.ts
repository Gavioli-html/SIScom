import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/authenticate.js'

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/dashboard', { preHandler: authenticate }, async (req) => {
    const { area_id, role } = req.user

    const areaFilter = role === 'admin' ? {} : { area_id }

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
          tecnico: { select: { nome: true } },
        },
      }),
    ])

    return {
      metricas: {
        abertos: totalAbertos,
        em_andamento: totalEmAndamento,
        resolvidos_mes: resolvidosMes,
        vencidos,
      },
      urgentes,
    }
  })
}
