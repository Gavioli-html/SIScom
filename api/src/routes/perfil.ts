import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/authenticate.js'

export async function perfilRoutes(app: FastifyInstance) {

  // PATCH /perfil — atualiza nome e/ou senha do próprio usuário
  app.patch('/perfil', { preHandler: authenticate }, async (req, reply) => {
    const { nome, senha_atual, senha_nova } = req.body as {
      nome?: string
      senha_atual?: string
      senha_nova?: string
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: req.user.sub } })
    if (!usuario) return reply.status(404).send({ error: 'Usuário não encontrado' })

    const data: Record<string, unknown> = {}

    if (nome?.trim()) data.nome = nome.trim()

    if (senha_nova?.trim()) {
      if (!senha_atual?.trim()) {
        return reply.status(400).send({ error: 'Informe a senha atual para alterá-la' })
      }
      const senhaOk = await bcrypt.compare(senha_atual, usuario.senha)
      if (!senhaOk) {
        return reply.status(400).send({ error: 'Senha atual incorreta' })
      }
      if (senha_nova.length < 6) {
        return reply.status(400).send({ error: 'A nova senha deve ter ao menos 6 caracteres' })
      }
      data.senha = await bcrypt.hash(senha_nova, 10)
    }

    if (Object.keys(data).length === 0) {
      return reply.status(400).send({ error: 'Nenhuma alteração informada' })
    }

    const atualizado = await prisma.usuario.update({
      where: { id: req.user.sub },
      data,
      select: { id: true, nome: true, email: true, role: true, area: { select: { id: true, slug: true, nome: true } } },
    })

    return { usuario: atualizado }
  })
}
