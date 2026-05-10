import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/authenticate.js'
import { calcularSla, gerarProtocolo } from '../lib/sla.js'
import { logHistorico } from '../lib/historico.js'

export async function chamadoRoutes(app: FastifyInstance) {

  // GET /chamados
  app.get('/chamados', { preHandler: authenticate }, async (req) => {
    const { status, prioridade, tecnico_id, q, tag, page = '1', prazo_inicio, prazo_fim } = req.query as Record<string, string>
    const { area_id, role } = req.user

    const where: Record<string, unknown> = {}

    if (role === 'solicitante') {
      where.solicitante_id = req.user.sub
    } else {
      where.area_id = area_id
    }

    if (status) where.status = status
    if (prioridade) where.prioridade = prioridade
    if (tecnico_id) where.tecnicos = { some: { tecnico_id: Number(tecnico_id) } }
    if (tag) where.tags = { some: { tag: { slug: tag } } }
    if (q) {
      where.AND = [
        ...(Array.isArray(where.AND) ? (where.AND as unknown[]) : []),
        {
          OR: [
            { protocolo: { contains: q } },
            { titulo: { contains: q } },
          ],
        },
      ]
    }
    if (prazo_inicio || prazo_fim) {
      where.sla_prazo = {
        ...(prazo_inicio ? { gte: new Date(prazo_inicio) } : {}),
        ...(prazo_fim ? { lte: new Date(prazo_fim) } : {}),
      }
    }

    // sem paginação quando buscando por intervalo de datas (uso do calendário)
    const semPaginacao = !!(prazo_inicio || prazo_fim)
    const take = semPaginacao ? 500 : 20
    const skip = semPaginacao ? 0 : (Number(page) - 1) * take

    const [chamados, total] = await Promise.all([
      prisma.chamado.findMany({
        where,
        orderBy: [{ sla_prazo: 'asc' }, { aberto_em: 'desc' }],
        take,
        skip,
        select: {
          id: true,
          protocolo: true,
          titulo: true,
          status: true,
          prioridade: true,
          sla_prazo: true,
          aberto_em: true,
          area: { select: { slug: true, nome: true } },
          solicitante: { select: { id: true, nome: true } },
          tecnicos: { select: { tecnico: { select: { id: true, nome: true } } } },
          tags: { include: { tag: true } },
        },
      }),
      prisma.chamado.count({ where }),
    ])

    return { chamados, total, page: Number(page), pages: Math.ceil(total / take) }
  })

  // POST /chamados
  app.post('/chamados', { preHandler: authenticate }, async (req, reply) => {
    const body = req.body as {
      titulo: string
      descricao: string
      template_id: number
      prioridade: string
      secretaria_solicitante?: string
      campos?: { chave: string; valor: string }[]
      formato?: string
    }

    if (!body.titulo || !body.descricao || !body.template_id) {
      return reply.status(400).send({ error: 'titulo, descricao e template_id são obrigatórios' })
    }

    const template = await prisma.templateChamado.findUnique({
      where: { id: body.template_id },
    })

    if (!template) {
      return reply.status(404).send({ error: 'Template não encontrado' })
    }

    const protocolo = await gerarProtocolo(prisma)
    const sla_prazo = calcularSla(template.sla_config_json, body.prioridade ?? 'normal', body.formato)

    const chamado = await prisma.chamado.create({
      data: {
        protocolo,
        titulo: body.titulo,
        descricao: body.descricao,
        template_id: body.template_id,
        area_id: template.area_id,
        solicitante_id: req.user.sub,
        prioridade: (body.prioridade as never) ?? 'normal',
        secretaria_solicitante: body.secretaria_solicitante ?? null,
        sla_prazo,
        campos: body.campos?.length
          ? { create: body.campos }
          : undefined,
      },
      include: {
        campos: true,
        area: { select: { slug: true, nome: true } },
      },
    })

    await logHistorico(chamado.id, 'ABERTURA', 'Chamado aberto', req.user.sub)

    return reply.status(201).send({ chamado })
  })

  // GET /chamados/:id
  app.get('/chamados/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { area_id, role } = req.user

    const chamado = await prisma.chamado.findUnique({
      where: { id: Number(id) },
      include: {
        campos: true,
        tags: { include: { tag: true } },
        area: { select: { slug: true, nome: true } },
        template: { select: { nome: true, campos_json: true } },
        solicitante: { select: { id: true, nome: true, email: true } },
        tecnicos: { select: { tecnico: { select: { id: true, nome: true, email: true } } } },
        mensagens: {
          orderBy: { criado_em: 'asc' },
          include: { autor: { select: { id: true, nome: true, role: true } } },
        },
        historico: {
          orderBy: { criado_em: 'asc' },
          include: { autor: { select: { id: true, nome: true } } },
        },
        ativos: {
          include: { ativo: true },
        },
      },
    })

    if (!chamado) return reply.status(404).send({ error: 'Chamado não encontrado' })

    if (role === 'solicitante' && chamado.solicitante_id !== req.user.sub) {
      return reply.status(403).send({ error: 'Acesso negado' })
    } else if (role !== 'solicitante' && chamado.area_id !== area_id) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }

    return { chamado }
  })

  // PATCH /chamados/:id/status
  app.patch('/chamados/:id/status', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: string }
    const { area_id, role } = req.user

    const TRANSICOES: Record<string, string[]> = {
      ABERTO:      ['EM_ANALISE', 'CANCELADO'],
      EM_ANALISE:  ['ATRIBUIDO', 'CANCELADO'],
      ATRIBUIDO:   ['EM_ANDAMENTO', 'CANCELADO'],
      EM_ANDAMENTO:['RESOLVIDO', 'CANCELADO'],
      RESOLVIDO:   ['ENCERRADO', 'EM_ANDAMENTO'],
    }

    const chamado = await prisma.chamado.findUnique({ where: { id: Number(id) }, select: { status: true, area_id: true } })
    if (!chamado) return reply.status(404).send({ error: 'Chamado não encontrado' })
    if (chamado.area_id !== area_id) return reply.status(403).send({ error: 'Acesso negado' })

    const permitidos = TRANSICOES[chamado.status] ?? []
    if (!permitidos.includes(status)) {
      return reply.status(400).send({ error: `Transição inválida: ${chamado.status} → ${status}` })
    }

    const encerrado = ['RESOLVIDO', 'ENCERRADO', 'CANCELADO'].includes(status)

    const atualizado = await prisma.chamado.update({
      where: { id: Number(id) },
      data: {
        status: status as never,
        fechado_em: encerrado ? new Date() : null,
      },
      select: { id: true, status: true, fechado_em: true },
    })

    const STATUS_LABEL: Record<string, string> = {
      ABERTO: 'Aberto', EM_ANALISE: 'Em Análise', ATRIBUIDO: 'Atribuído',
      EM_ANDAMENTO: 'Em Andamento', RESOLVIDO: 'Resolvido', ENCERRADO: 'Encerrado', CANCELADO: 'Cancelado',
    }
    await logHistorico(
      Number(id), 'STATUS',
      `Status alterado para ${STATUS_LABEL[status] ?? status}`,
      req.user.sub
    )

    return { chamado: atualizado }
  })

  // POST /chamados/:id/tecnicos — adicionar técnico
  app.post('/chamados/:id/tecnicos', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { tecnico_id } = req.body as { tecnico_id: number }
    const { area_id, role } = req.user

    if (!['tecnico', 'gestor', 'admin'].includes(role)) {
      return reply.status(403).send({ error: 'Apenas técnicos e gestores podem atribuir chamados' })
    }

    const chamado = await prisma.chamado.findUnique({ where: { id: Number(id) }, select: { area_id: true, status: true } })
    if (!chamado) return reply.status(404).send({ error: 'Chamado não encontrado' })
    if (chamado.area_id !== area_id) return reply.status(403).send({ error: 'Acesso negado' })

    const tecnico = await prisma.usuario.findUnique({ where: { id: tecnico_id }, select: { role: true } })
    if (!tecnico || !['tecnico', 'gestor', 'admin'].includes(tecnico.role)) {
      return reply.status(400).send({ error: 'Técnico inválido' })
    }

    await prisma.chamadoTecnico.upsert({
      where: { chamado_id_tecnico_id: { chamado_id: Number(id), tecnico_id } },
      create: { chamado_id: Number(id), tecnico_id },
      update: {},
    })

    if (chamado.status === 'ABERTO' || chamado.status === 'EM_ANALISE') {
      await prisma.chamado.update({
        where: { id: Number(id) },
        data: { status: 'ATRIBUIDO' },
      })
    }

    const tec = await prisma.usuario.findUnique({ where: { id: tecnico_id }, select: { nome: true } })
    await logHistorico(Number(id), 'ATRIBUICAO', `Técnico ${tec?.nome ?? '#' + tecnico_id} atribuído`, req.user.sub)

    return { ok: true }
  })

  // DELETE /chamados/:id/tecnicos/:tecnico_id — remover técnico
  app.delete('/chamados/:id/tecnicos/:tecnico_id', { preHandler: authenticate }, async (req, reply) => {
    const { id, tecnico_id } = req.params as { id: string; tecnico_id: string }
    const { area_id, role } = req.user

    if (!['tecnico', 'gestor', 'admin'].includes(role)) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }

    const chamado = await prisma.chamado.findUnique({ where: { id: Number(id) }, select: { area_id: true } })
    if (!chamado) return reply.status(404).send({ error: 'Chamado não encontrado' })
    if (chamado.area_id !== area_id) return reply.status(403).send({ error: 'Acesso negado' })

    const tec = await prisma.usuario.findUnique({ where: { id: Number(tecnico_id) }, select: { nome: true } })
    await prisma.chamadoTecnico.deleteMany({
      where: { chamado_id: Number(id), tecnico_id: Number(tecnico_id) },
    })
    await logHistorico(Number(id), 'REMOCAO', `Técnico ${tec?.nome ?? '#' + tecnico_id} removido`, req.user.sub)

    return { ok: true }
  })

  // GET /tecnicos — lista técnicos da área para o select de atribuição
  app.get('/tecnicos', { preHandler: authenticate }, async (req) => {
    const { area_id } = req.user
    const tecnicos = await prisma.usuario.findMany({
      where: {
        role: { in: ['tecnico', 'gestor'] },
        area_id,
        ativo: true,
      },
      select: { id: true, nome: true, role: true },
      orderBy: { nome: 'asc' },
    })
    return { tecnicos }
  })
}
