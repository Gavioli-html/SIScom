import prisma from './prisma.js'

export async function logHistorico(
  chamado_id: number,
  tipo: string,
  descricao: string,
  autor_id?: number | null
) {
  await prisma.historico.create({
    data: { chamado_id, tipo, descricao, autor_id: autor_id ?? null },
  })
}
