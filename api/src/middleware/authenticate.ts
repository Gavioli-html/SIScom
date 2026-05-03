import { FastifyRequest, FastifyReply } from 'fastify'
import { verify, TokenPayload } from '../lib/jwt.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: TokenPayload
  }
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Token não fornecido' })
  }

  try {
    req.user = verify(header.slice(7))
  } catch {
    return reply.status(401).send({ error: 'Token inválido ou expirado' })
  }
}

export function requireRole(...roles: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!roles.includes(req.user?.role)) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }
  }
}
