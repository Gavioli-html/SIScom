import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import './Chat.css'

interface Mensagem {
  id: number
  conteudo: string
  criado_em: string
  autor: { id: number; nome: string; role: string }
}

interface ChatProps {
  chamadoId: number
  encerrado: boolean
}

function iniciais(nome: string) {
  return nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Chat({ chamadoId, encerrado }: ChatProps) {
  const { usuario } = useAuth()
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const carregar = () =>
    api.get<{ mensagens: Mensagem[] }>(`/chamados/${chamadoId}/mensagens`)
      .then(d => setMensagens(d.mensagens))
      .catch(() => null)

  useEffect(() => {
    carregar()
    if (encerrado) return
    const id = setInterval(carregar, 15_000)
    return () => clearInterval(id)
  }, [chamadoId, encerrado])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  const enviar = async () => {
    if (!texto.trim() || enviando) return
    setEnviando(true)
    try {
      await api.post(`/chamados/${chamadoId}/mensagens`, { conteudo: texto })
      setTexto('')
      await carregar()
    } finally {
      setEnviando(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) enviar()
  }

  return (
    <div className="chat">
      <div className="chat-header">
        <span className="card-title">Histórico</span>
        <span className="chat-count">{mensagens.length} mensagem{mensagens.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="chat-msgs">
        {mensagens.length === 0 && (
          <p className="chat-empty">Nenhuma mensagem ainda.</p>
        )}
        {mensagens.map(msg => {
          const proprio = msg.autor.id === usuario?.id
          return (
            <div key={msg.id} className={`msg ${proprio ? 'msg--proprio' : ''}`}>
              <div className="msg-avatar">{iniciais(msg.autor.nome)}</div>
              <div className="msg-content">
                <div className="msg-meta">
                  <strong>{proprio ? 'Você' : msg.autor.nome}</strong>
                  <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{msg.autor.role}</span>
                  <span className="msg-time">{fmtData(msg.criado_em)}</span>
                </div>
                <p className="msg-text">{msg.conteudo}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {!encerrado && (
        <div className="chat-input-area">
          <textarea
            className="form-textarea chat-textarea"
            placeholder="Digite uma mensagem... (Ctrl+Enter para enviar)"
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={onKeyDown}
            rows={3}
            disabled={enviando}
          />
          <button
            className="btn btn-primary"
            onClick={enviar}
            disabled={!texto.trim() || enviando}
          >
            {enviando ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      )}
    </div>
  )
}
