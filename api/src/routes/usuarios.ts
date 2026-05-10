import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { authenticate, requireRole } from '../middleware/authenticate.js'

export async function usuarioRoutes(app: FastifyInstance) {

  // GET /areas — para popular selects no frontend
  app.get('/areas', { preHandler: authenticate }, async () => {
    const areas = await prisma.area.findMany({
      select: { id: true, nome: true, slug: true },
      orderBy: { nome: 'asc' },
    })
    return { areas }
  })

  // GET /usuarios
  app.get('/usuarios', { preHandler: [authenticate, requireRole('gestor', 'admin')] }, async (req) => {
    const { area_id } = req.user
    const where = { area_id }

    const usuarios = await prisma.usuario.findMany({
      where,
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
      select: {
        id: true, nome: true, email: true, role: true, ativo: true, criado_em: true,
        area: { select: { id: true, nome: true, slug: true } },
      },
    })
    return { usuarios }
  })

  // POST /usuarios
  app.post('/usuarios', { preHandler: [authenticate, requireRole('admin')] }, async (req, reply) => {
    const { nome, email, senha, role } = req.body as {
      nome: string; email: string; senha: string; role: string
    }
    const area_id = req.user.area_id

    if (!nome || !email || !senha || !role) {
      return reply.status(400).send({ error: 'Todos os campos são obrigatórios' })
    }

    const existe = await prisma.usuario.findUnique({ where: { email } })
    if (existe) return reply.status(400).send({ error: 'E-mail já cadastrado' })

    const hash = await bcrypt.hash(senha, 10)
    const usuario = await prisma.usuario.create({
      data: { nome, email, senha: hash, role: role as never, area_id },
      select: {
        id: true, nome: true, email: true, role: true, ativo: true,
        area: { select: { id: true, nome: true, slug: true } },
      },
    })
    return reply.status(201).send({ usuario })
  })

  // PATCH /usuarios/:id
  app.patch('/usuarios/:id', { preHandler: [authenticate, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { nome, email, senha, role } = req.body as {
      nome?: string; email?: string; senha?: string; role?: string
    }

    const existe = await prisma.usuario.findUnique({ where: { id: Number(id) } })
    if (!existe) return reply.status(404).send({ error: 'Usuário não encontrado' })
    if (existe.area_id !== req.user.area_id) return reply.status(403).send({ error: 'Acesso negado' })

    if (email && email !== existe.email) {
      const duplicado = await prisma.usuario.findUnique({ where: { email } })
      if (duplicado) return reply.status(400).send({ error: 'E-mail já em uso' })
    }

    const data: Record<string, unknown> = {}
    if (nome) data.nome = nome
    if (email) data.email = email
    if (role) data.role = role
    if (senha?.trim()) data.senha = await bcrypt.hash(senha, 10)

    const usuario = await prisma.usuario.update({
      where: { id: Number(id) },
      data,
      select: {
        id: true, nome: true, email: true, role: true, ativo: true,
        area: { select: { id: true, nome: true, slug: true } },
      },
    })
    return { usuario }
  })

  // DELETE /usuarios/:id — apenas admin, não pode se auto-deletar
  app.delete('/usuarios/:id', { preHandler: [authenticate, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const numId = Number(id)

    if (numId === req.user.sub) {
      return reply.status(400).send({ error: 'Você não pode excluir sua própria conta' })
    }

    const existe = await prisma.usuario.findUnique({ where: { id: numId } })
    if (!existe) return reply.status(404).send({ error: 'Usuário não encontrado' })
    if (existe.area_id !== req.user.area_id) return reply.status(403).send({ error: 'Acesso negado' })

    const [chamadosAbertos, chamadosTecnico] = await Promise.all([
      prisma.chamado.count({ where: { solicitante_id: numId } }),
      prisma.chamadoTecnico.count({ where: { tecnico_id: numId } }),
    ])
    const temChamados = chamadosAbertos + chamadosTecnico

    if (temChamados > 0) {
      return reply.status(400).send({
        error: `Não é possível excluir: usuário possui ${temChamados} chamado(s) vinculado(s). Desative-o em vez disso.`,
      })
    }

    await prisma.usuario.delete({ where: { id: numId } })
    return { ok: true }
  })

  // PATCH /usuarios/:id/ativo — toggle ativo/inativo
  app.patch('/usuarios/:id/ativo', { preHandler: [authenticate, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { ativo } = req.body as { ativo: boolean }

    if (Number(id) === req.user.sub) {
      return reply.status(400).send({ error: 'Você não pode desativar sua própria conta' })
    }

    const alvo = await prisma.usuario.findUnique({ where: { id: Number(id) }, select: { area_id: true } })
    if (!alvo) return reply.status(404).send({ error: 'Usuário não encontrado' })
    if (alvo.area_id !== req.user.area_id) return reply.status(403).send({ error: 'Acesso negado' })

    const usuario = await prisma.usuario.update({
      where: { id: Number(id) },
      data: { ativo },
      select: { id: true, ativo: true },
    })
    return { usuario }
  })
}
