import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { signAccess, signRefresh, verify, TokenPayload } from '../lib/jwt.js'
import { authenticate } from '../middleware/authenticate.js'

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (req, reply) => {
    const { email, senha } = req.body as { email: string; senha: string }

    if (!email || !senha) {
      return reply.status(400).send({ error: 'Email e senha obrigatórios' })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { area: { select: { id: true, slug: true, nome: true } } },
    })

    if (!usuario || !usuario.ativo) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }

    const senhaOk = await bcrypt.compare(senha, usuario.senha)
    if (!senhaOk) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }

    const payload: TokenPayload = {
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
      area_id: usuario.area_id,
    }

    const accessToken = signAccess(payload)
    const refreshToken = signRefresh(payload)

    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 60 * 60 * 24 * 7,
    })

    return {
      access_token: accessToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        area: usuario.area,
      },
    }
  })

  app.post('/auth/refresh', async (req, reply) => {
    const token = req.cookies?.refresh_token
    if (!token) {
      return reply.status(401).send({ error: 'Refresh token não encontrado' })
    }

    try {
      const payload = verify(token)
      const { iat: _i, exp: _e, ...rest } = payload as TokenPayload & { iat?: number; exp?: number }
      const accessToken = signAccess(rest)
      return { access_token: accessToken }
    } catch {
      return reply.status(401).send({ error: 'Refresh token inválido' })
    }
  })

  app.post('/auth/logout', async (_req, reply) => {
    reply.clearCookie('refresh_token', { path: '/auth/refresh' })
    return { ok: true }
  })

  app.get('/auth/me', { preHandler: authenticate }, async (req) => {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.sub },
      select: { id: true, nome: true, email: true, role: true, area: { select: { id: true, slug: true, nome: true } } },
    })
    return { usuario }
  })
}
