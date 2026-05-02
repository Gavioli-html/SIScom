import './DesignSystem.css'

export default function DesignSystem() {
  return (
    <div className="ds-page">
      <h1 className="ds-heading">Design System — SIScom</h1>

      <section className="ds-section">
        <h2 className="ds-subheading">Status de Chamado (Badge)</h2>
        <div className="ds-row">
          <span className="badge badge-primary">Atribuído</span>
          <span className="badge badge-warning">Em Análise</span>
          <span className="badge badge-success">Resolvido</span>
          <span className="badge badge-danger">Crítico</span>
          <span className="badge badge-neutral">Aguardando</span>
        </div>
      </section>

      <section className="ds-section">
        <h2 className="ds-subheading">Prioridade (Tag)</h2>
        <div className="ds-row">
          <span className="tag tag-critica">Crítica</span>
          <span className="tag tag-alta">Alta</span>
          <span className="tag tag-media">Média</span>
          <span className="tag tag-baixa">Baixa</span>
          <span className="tag tag-normal">Normal</span>
        </div>
      </section>

      <section className="ds-section">
        <h2 className="ds-subheading">Alertas</h2>
        <div className="ds-stack">
          <div className="alert alert-info">Informação — chamado atribuído ao técnico João Silva.</div>
          <div className="alert alert-success">Sucesso — chamado #2026-00001 encerrado com sucesso.</div>
          <div className="alert alert-warning">Atenção — SLA vence em menos de 1 hora.</div>
          <div className="alert alert-danger">Crítico — servidor offline detectado. Incidente em massa aberto.</div>
        </div>
      </section>

      <section className="ds-section">
        <h2 className="ds-subheading">Formulário</h2>
        <div className="ds-form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="titulo">
              Título <span className="required">*</span>
            </label>
            <input id="titulo" className="form-input" type="text" placeholder="Descreva o problema" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="prioridade">Prioridade</label>
            <select id="prioridade" className="form-select">
              <option>Normal</option>
              <option>Baixa</option>
              <option>Média</option>
              <option>Alta</option>
              <option>Crítica</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="campo-erro">Campo com erro</label>
            <input id="campo-erro" className="form-input err" type="text" defaultValue="valor inválido" />
            <span className="form-error">Campo obrigatório.</span>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="campo-ok">Campo válido</label>
            <input id="campo-ok" className="form-input ok" type="text" defaultValue="valor correto" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="campo-disabled">Desabilitado</label>
            <input id="campo-disabled" className="form-input" type="text" disabled defaultValue="somente leitura" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="descricao">Descrição</label>
            <textarea id="descricao" className="form-textarea" placeholder="Detalhes do chamado..." />
            <span className="form-hint">Inclua o máximo de detalhes possível.</span>
          </div>
        </div>
      </section>

      <section className="ds-section">
        <h2 className="ds-subheading">Botões</h2>
        <div className="ds-row">
          <button className="btn btn-primary">Abrir Chamado</button>
          <button className="btn btn-secondary">Cancelar</button>
          <button className="btn btn-danger">Encerrar</button>
          <button className="btn btn-primary btn-sm">Salvar</button>
          <button className="btn btn-primary" disabled>Desabilitado</button>
        </div>
      </section>

      <section className="ds-section">
        <h2 className="ds-subheading">Card</h2>
        <div className="card" style={{ maxWidth: 400 }}>
          <div className="card-header">
            <span className="card-title">Chamado #2026-00001</span>
            <span className="badge badge-primary">Atribuído</span>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-soft)' }}>
            Impressora da secretaria não imprime desde ontem às 14h.
          </p>
          <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
            <span className="tag tag-media">Média</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-soft)', alignSelf: 'center' }}>
              Vence em 3h 20min
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
