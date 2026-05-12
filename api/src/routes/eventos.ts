import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/authenticate.js'

export async function eventoRoutes(app: FastifyInstance) {
  app.get('/eventos', { preHandler: authenticate }, async (req) => {
    const { inicio, fim } = req.query as { inicio?: string; fim?: string }

    const eventos = await prisma.eventoCalendario.findMany({
      where: {
        area_id: req.user.area_id,
        ...(inicio || fim ? {
          data: {
            ...(inicio ? { gte: new Date(inicio) } : {}),
            ...(fim    ? { lte: new Date(fim)    } : {}),
          },
        } : {}),
      },
      include: { criado_por: { select: { id: true, nome: true } } },
      orderBy: { data: 'asc' },
    })

    return { eventos }
  })

  app.post('/eventos', { preHandler: authenticate }, async (req, reply) => {
    const { titulo, data, cor, descricao } = req.body as {
      titulo: string
      data: string
      cor?: string
      descricao?: string
    }

    if (!titulo?.trim()) return reply.status(400).send({ error: 'Título obrigatório.' })
    if (!data) return reply.status(400).send({ error: 'Data obrigatória.' })

    const evento = await prisma.eventoCalendario.create({
      data: {
        area_id: req.user.area_id,
        criado_por_id: req.user.sub,
        titulo: titulo.trim(),
        data: new Date(data),
        cor: cor ?? 'accent',
        descricao: descricao?.trim() || null,
      },
      include: { criado_por: { select: { id: true, nome: true } } },
    })

    return reply.status(201).send({ evento })
  })

  app.delete('/eventos/:id', { preHandler: authenticate }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id)

    const evento = await prisma.eventoCalendario.findUnique({ where: { id } })
    if (!evento) return reply.status(404).send({ error: 'Evento não encontrado.' })
    if (evento.area_id !== req.user.area_id) return reply.status(403).send({ error: 'Sem permissão.' })

    await prisma.eventoCalendario.delete({ where: { id } })
    return { ok: true }
  })
}
