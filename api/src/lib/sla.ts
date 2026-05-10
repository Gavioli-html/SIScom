interface SlaConfigTI {
  [prioridade: string]: { resposta_min: number; resolucao_min: number }
}

interface SlaConfigSECOM {
  [tipo: string]: { prazo_dias_uteis: number }
}

function addMinutes(date: Date, min: number): Date {
  return new Date(date.getTime() + min * 60_000)
}

function addDiasUteis(date: Date, dias: number): Date {
  const result = new Date(date)
  let adicionados = 0
  while (adicionados < dias) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) adicionados++
  }
  return result
}

export function calcularSla(
  sla_config_json: unknown,
  prioridade: string,
  formato?: string
): Date | null {
  const config = sla_config_json as SlaConfigTI & SlaConfigSECOM
  const agora = new Date()

  // TI — por prioridade (critica/alta/media/baixa/normal)
  if (config[prioridade]?.resolucao_min !== undefined) {
    return addMinutes(agora, (config[prioridade] as { resolucao_min: number }).resolucao_min)
  }

  // SECOM — por formato de entrega (pode ser múltiplos, separados por vírgula)
  if (formato) {
    const formatos = formato.split(',').filter(Boolean)
    const prazos = formatos
      .map(f => (config[f.trim()] as { prazo_dias_uteis?: number } | undefined)?.prazo_dias_uteis)
      .filter((p): p is number => p !== undefined)
    if (prazos.length > 0) {
      return addDiasUteis(agora, Math.max(...prazos))
    }
  }

  return null
}

export async function gerarProtocolo(prisma: {
  chamado: { count: (args: object) => Promise<number> }
}): Promise<string> {
  const ano = new Date().getFullYear()
  const count = await prisma.chamado.count({
    where: {
      aberto_em: {
        gte: new Date(`${ano}-01-01`),
        lt: new Date(`${ano + 1}-01-01`),
      },
    },
  })
  const seq = String(count + 1).padStart(5, '0')
  return `${ano}-${seq}`
}
