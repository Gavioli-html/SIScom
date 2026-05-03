import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/authenticate.js'

export async function mensagemRoutes(app: FastifyInstance) {
  app.get('/chamados/:id/mensagens', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { area_id, role } = req.user

    const chamado = await prisma.chamado.findUnique({ where: { id: Number(id) }, select: { area_id: true } })
    if (!chamado) return reply.status(404).send({ error: 'Chamado não encontrado' })
    if (role !== 'admin' && chamado.area_id !== area_id) return reply.status(403).send({ error: 'Acesso negado' })

    const mensagens = await prisma.mensagem.findMany({
      where: { chamado_id: Number(id) },
      orderBy: { criado_em: 'asc' },
      include: { autor: { select: { id: true, nome: true, role: true } } },
    })

    return { mensagens }
  })

  app.post('/chamados/:id/mensagens', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { conteudo } = req.body as { conteudo: string }
    const { sub, area_id, role } = req.user

    if (!conteudo?.trim()) return reply.status(400).send({ error: 'Mensagem não pode ser vazia' })

    const chamado = await prisma.chamado.findUnique({ where: { id: Number(id) }, select: { area_id: true, status: true } })
    if (!chamado) return reply.status(404).send({ error: 'Chamado não encontrado' })
    if (role !== 'admin' && chamado.area_id !== area_id) return reply.status(403).send({ error: 'Acesso negado' })
    if (['ENCERRADO', 'CANCELADO'].includes(chamado.status)) return reply.status(400).send({ error: 'Chamado encerrado' })

    const mensagem = await prisma.mensagem.create({
      data: { chamado_id: Number(id), autor_id: sub, conteudo: conteudo.trim() },
      include: { autor: { select: { id: true, nome: true, role: true } } },
    })

    return reply.status(201).send({ mensagem })
  })
}
