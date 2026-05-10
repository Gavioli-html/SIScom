import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/authenticate.js'

const ROLES_TI = ['tecnico', 'gestor', 'admin']

export async function ativoRoutes(app: FastifyInstance) {

  // GET /ativos — listagem com filtros; também serve como lookup por patrimônio exato
  app.get('/ativos', { preHandler: authenticate }, async (req, reply) => {
    const { tipo, status, q, patrimonio } = req.query as Record<string, string>
    const { area_id, role } = req.user

    if (!ROLES_TI.includes(role)) return reply.status(403).send({ error: 'Sem permissão' })

    // Lookup exato por patrimônio (para o autocomplete do formulário)
    if (patrimonio) {
      const ativo = await prisma.ativo.findFirst({
        where: { patrimonio, area_id },
      })
      return { ativo: ativo ?? null }
    }

    const where: Record<string, unknown> = { area_id }
    if (tipo) where.tipo = tipo
    if (status) where.status = status
    if (q) {
      where.AND = [{
        OR: [
          { patrimonio: { contains: q } },
          { descricao:  { contains: q } },
          { localizacao: { contains: q } },
          { marca:  { contains: q } },
          { modelo: { contains: q } },
        ],
      }]
    }

    const ativos = await prisma.ativo.findMany({
      where,
      orderBy: { patrimonio: 'asc' },
    })

    return { ativos }
  })

  // GET /ativos/:id — detalhe + chamados vinculados
  app.get('/ativos/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { area_id, role } = req.user

    if (!ROLES_TI.includes(role)) return reply.status(403).send({ error: 'Sem permissão' })

    const ativo = await prisma.ativo.findUnique({
      where: { id: Number(id) },
      include: {
        chamados: {
          include: {
            chamado: {
              select: {
                id: true,
                protocolo: true,
                titulo: true,
                status: true,
                prioridade: true,
                aberto_em: true,
              },
            },
          },
          orderBy: { chamado: { aberto_em: 'desc' } },
        },
      },
    })

    if (!ativo) return reply.status(404).send({ error: 'Ativo não encontrado' })
    if (ativo.area_id !== area_id) return reply.status(403).send({ error: 'Acesso negado' })

    return { ativo }
  })

  // POST /ativos — cadastrar novo ativo
  app.post('/ativos', { preHandler: authenticate }, async (req, reply) => {
    const { area_id, role } = req.user
    if (!ROLES_TI.includes(role)) return reply.status(403).send({ error: 'Sem permissão' })

    const body = req.body as Record<string, string>

    if (!body.patrimonio || !body.tipo) {
      return reply.status(400).send({ error: 'patrimônio e tipo são obrigatórios' })
    }

    const ativo = await prisma.ativo.create({
      data: {
        area_id,
        patrimonio:   body.patrimonio.trim(),
        tipo:         body.tipo,
        descricao:    body.descricao    || null,
        localizacao:  body.localizacao  || null,
        ip:           body.ip           || null,
        mac:          body.mac          || null,
        marca:        body.marca        || null,
        modelo:       body.modelo       || null,
        nr_serie:     body.nr_serie     || null,
        comprado_em:  body.comprado_em  ? new Date(body.comprado_em)  : null,
        garantia_ate: body.garantia_ate ? new Date(body.garantia_ate) : null,
        status:       body.status       || 'ativo',
        observacoes:  body.observacoes  || null,
      },
    })

    return reply.status(201).send({ ativo })
  })

  // PATCH /ativos/:id — editar ativo
  app.patch('/ativos/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { area_id, role } = req.user

    if (!ROLES_TI.includes(role)) return reply.status(403).send({ error: 'Sem permissão' })

    const existente = await prisma.ativo.findUnique({ where: { id: Number(id) } })
    if (!existente) return reply.status(404).send({ error: 'Ativo não encontrado' })
    if (existente.area_id !== area_id) return reply.status(403).send({ error: 'Acesso negado' })

    const body = req.body as Record<string, string | undefined>
    const d = (key: string) => key in body ? (body[key] || null) : undefined
    const dt = (key: string) => key in body ? (body[key] ? new Date(body[key]!) : null) : undefined

    const ativo = await prisma.ativo.update({
      where: { id: Number(id) },
      data: {
        tipo:         body.tipo         ?? existente.tipo,
        descricao:    d('descricao')    ?? existente.descricao,
        localizacao:  d('localizacao')  ?? existente.localizacao,
        ip:           d('ip')           ?? existente.ip,
        mac:          d('mac')          ?? existente.mac,
        marca:        d('marca')        ?? existente.marca,
        modelo:       d('modelo')       ?? existente.modelo,
        nr_serie:     d('nr_serie')     ?? existente.nr_serie,
        comprado_em:  dt('comprado_em') ?? existente.comprado_em,
        garantia_ate: dt('garantia_ate') ?? existente.garantia_ate,
        status:       body.status       ?? existente.status,
        observacoes:  d('observacoes')  ?? existente.observacoes,
      },
    })

    return { ativo }
  })

  // POST /chamados/:id/ativos — vincular ativo a um chamado
  app.post('/chamados/:id/ativos', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { ativo_id } = req.body as { ativo_id: number }
    const { area_id } = req.user

    const chamado = await prisma.chamado.findUnique({
      where: { id: Number(id) },
      select: { area_id: true },
    })
    if (!chamado) return reply.status(404).send({ error: 'Chamado não encontrado' })
    if (chamado.area_id !== area_id) return reply.status(403).send({ error: 'Acesso negado' })

    await prisma.chamadoAtivo.upsert({
      where: { chamado_id_ativo_id: { chamado_id: Number(id), ativo_id } },
      create: { chamado_id: Number(id), ativo_id },
      update: {},
    })

    return { ok: true }
  })
}
