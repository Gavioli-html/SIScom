import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/authenticate.js'
import { logHistorico } from '../lib/historico.js'

function gerarSlug(label: string): string {
  return label
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export async function tagRoutes(app: FastifyInstance) {

  // GET /tags
  app.get('/tags', { preHandler: authenticate }, async () => {
    const tags = await prisma.tag.findMany({ orderBy: { label: 'asc' } })
    return { tags }
  })

  // POST /tags — gestor/admin
  app.post('/tags', { preHandler: authenticate }, async (req, reply) => {
    const { role } = req.user
    if (!['gestor', 'admin'].includes(role)) {
      return reply.status(403).send({ error: 'Apenas gestores e admins podem criar tags' })
    }

    const { label, cor } = req.body as { label: string; cor: string }
    if (!label || !cor) {
      return reply.status(400).send({ error: 'label e cor são obrigatórios' })
    }

    const slug = gerarSlug(label)
    const existe = await prisma.tag.findUnique({ where: { slug } })
    if (existe) {
      return reply.status(409).send({ error: 'Já existe uma tag com esse nome' })
    }

    const tag = await prisma.tag.create({ data: { slug, label, cor } })
    return reply.status(201).send({ tag })
  })

  // DELETE /tags/:id — admin
  app.delete('/tags/:id', { preHandler: authenticate }, async (req, reply) => {
    const { role } = req.user
    if (role !== 'admin') {
      return reply.status(403).send({ error: 'Apenas admins podem excluir tags' })
    }

    const { id } = req.params as { id: string }
    await prisma.chamadoTag.deleteMany({ where: { tag_id: Number(id) } })
    await prisma.tag.delete({ where: { id: Number(id) } })
    return { ok: true }
  })

  // POST /chamados/:id/tags — adicionar tag ao chamado
  app.post('/chamados/:id/tags', { preHandler: authenticate }, async (req, reply) => {
    const { role } = req.user
    if (!['tecnico', 'gestor', 'admin'].includes(role)) {
      return reply.status(403).send({ error: 'Sem permissão para taguear chamados' })
    }

    const { id } = req.params as { id: string }
    const { tag_id } = req.body as { tag_id: number }

    const chamado = await prisma.chamado.findUnique({
      where: { id: Number(id) },
      select: { id: true },
    })
    if (!chamado) return reply.status(404).send({ error: 'Chamado não encontrado' })

    const tag = await prisma.tag.findUnique({ where: { id: tag_id } })
    if (!tag) return reply.status(404).send({ error: 'Tag não encontrada' })

    await prisma.chamadoTag.upsert({
      where: { chamado_id_tag_id: { chamado_id: Number(id), tag_id } },
      create: { chamado_id: Number(id), tag_id },
      update: {},
    })
    await logHistorico(Number(id), 'TAG', `Tag #${tag.label} adicionada`, req.user.sub)

    return reply.status(201).send({ ok: true })
  })

  // DELETE /chamados/:id/tags/:tag_id — remover tag do chamado
  app.delete('/chamados/:id/tags/:tag_id', { preHandler: authenticate }, async (req, reply) => {
    const { role } = req.user
    if (!['tecnico', 'gestor', 'admin'].includes(role)) {
      return reply.status(403).send({ error: 'Sem permissão' })
    }

    const { id, tag_id } = req.params as { id: string; tag_id: string }
    const tag = await prisma.tag.findUnique({ where: { id: Number(tag_id) }, select: { label: true } })
    await prisma.chamadoTag.deleteMany({
      where: { chamado_id: Number(id), tag_id: Number(tag_id) },
    })
    if (tag) await logHistorico(Number(id), 'TAG_REMOCAO', `Tag #${tag.label} removida`, req.user.sub)
    return { ok: true }
  })
}
