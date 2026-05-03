import { useEffect, useState } from 'react'

interface SlaCountdownProps {
  prazo: string | null
  status: string
}

const ENCERRADOS = ['RESOLVIDO', 'ENCERRADO', 'CANCELADO']

function fmt(ms: number): string {
  if (ms <= 0) return 'Vencido'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

export default function SlaCountdown({ prazo, status }: SlaCountdownProps) {
  const [ms, setMs] = useState<number | null>(null)

  useEffect(() => {
    if (!prazo || ENCERRADOS.includes(status)) return
    const calc = () => setMs(new Date(prazo).getTime() - Date.now())
    calc()
    const id = setInterval(calc, 30_000)
    return () => clearInterval(id)
  }, [prazo, status])

  if (!prazo) return <span style={{ color: 'var(--line)' }}>—</span>
  if (ENCERRADOS.includes(status)) return <span style={{ color: 'var(--sem-success)', fontFamily: 'var(--mono)', fontSize: 'var(--text-xs)' }}>Encerrado</span>
  if (ms === null) return null

  const vencido = ms <= 0
  const critico = !vencido && ms < 3_600_000
  const alerta = !vencido && ms < 7_200_000

  const cor = vencido ? 'var(--sem-danger)' : critico ? 'var(--sem-warning)' : alerta ? 'var(--sem-warning)' : 'var(--ink-soft)'

  return (
    <span style={{
      fontFamily: 'var(--mono)',
      fontSize: 'var(--text-xs)',
      fontWeight: vencido || critico ? 700 : 400,
      color: cor,
      whiteSpace: 'nowrap',
    }}>
      {fmt(ms)}
    </span>
  )
}
