import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/authenticate.js'

export async function templateRoutes(app: FastifyInstance) {
  app.get('/templates', { preHandler: authenticate }, async (req) => {
    const { area_id } = req.query as { area_id?: string }

    const templates = await prisma.templateChamado.findMany({
      where: area_id ? { area_id: Number(area_id) } : undefined,
      select: {
        id: true,
        nome: true,
        area_id: true,
        campos_json: true,
        sla_config_json: true,
      },
    })

    return { templates }
  })
}
