# CLAUDE.md — SIScom · Sistema de Gestão de Demandas
**Prefeitura Municipal de Jaguariaíva · v1.0.0**

> Leia este arquivo inteiro antes de tocar em qualquer código.

---

## 1. CONTEXTO DO PROJETO

**SIScom** é um sistema web de gestão de chamados internos para a Prefeitura Municipal de Jaguariaíva.

**Escopo inicial — dois pilares:**
- **SECOM** (Secretaria de Comunicação) — secretaria
- **TI** (Tecnologia da Informação) — departamento interno, não é secretaria

A arquitetura deve permitir expansão para outras secretarias no futuro sem reescrita.

**O sistema não é site institucional.** É uma aplicação interna, acessada por servidores públicos.

---

## 2. DESIGN SYSTEM — TOKENS CSS

### `:root` — fonte da verdade, nunca hardcodar valores fora daqui

```css
:root {
  /* Paleta principal */
  --ink:        #0d1433;
  --ink-mid:    #2b3278;
  --ink-soft:   #5262c4;
  --paper:      #f7f6f2;
  --paper-dark: #eeecea;
  --line:       #d4d2cc;
  --accent:     #0066cc;

  /* Tipografia */
  --mono: 'JetBrains Mono', monospace;
  --sans: 'Inter', 'Nunito Sans', 'Helvetica Neue', Arial, sans-serif;
  /* Proxima Nova é comercial (Adobe Fonts). Usar Inter em produção. */

  /* Semânticas — tons institucionais, não cores vivas genéricas */
  --sem-success:    #4a6741;
  --sem-success-bg: #eef2ec;
  --sem-success-bd: #b5c9b1;

  --sem-warning:    #7a5c1e;
  --sem-warning-bg: #f5eddb;
  --sem-warning-bd: #d4b87a;

  --sem-danger:     #6b2233;
  --sem-danger-bg:  #f2e8eb;
  --sem-danger-bd:  #c49aaa;

  --sem-info:       #1e3f6b;
  --sem-info-bg:    #e8eef5;
  --sem-info-bd:    #9ab3d0;

  /* Erro de formulário — separado de sem-danger (criticidade de chamado != erro de campo) */
  --color-error:    #6b2233;
  --color-error-bg: #f2e8eb;
  --color-error-bd: #c49aaa;

  /* Espaçamento — grid de 4px */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Border radius — usar com parcimônia, sistema prefere cantos retos */
  --radius-sm:   4px;
  --radius-md:   6px;
  --radius-lg:   8px;
  --radius-xl:   12px;
  --radius-2xl:  16px;
  --radius-full: 9999px;

  /* Tipografia — escala */
  --text-xs:   0.75rem;   /* 12px — badges, timestamps */
  --text-sm:   0.875rem;  /* 14px — labels, metadados */
  --text-base: 1rem;      /* 16px — corpo base */
  --text-lg:   1.25rem;   /* 20px — subtítulos */
  --text-xl:   1.5rem;    /* 24px — títulos de seção */
  --text-2xl:  1.875rem;  /* 30px — títulos de página */
  --text-3xl:  2.25rem;   /* 36px — headings */
  --text-4xl:  3rem;      /* 48px — display/hero */
}
```

### Regras absolutas de CSS

```css
/* NUNCA hardcodar cor fora do :root */
/* ERRADO */ color: #dc2626;
/* CORRETO */ color: var(--color-error);

/* NUNCA remover outline sem substituir */
/* ERRADO */ :focus { outline: none; }
/* CORRETO */ :focus:not(:focus-visible) { outline: none; }

/* Todo elemento interativo precisa de focus-visible */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
```

### Filosofia visual

- Cantos retos por padrão em todos os componentes — transmite seriedade institucional
- Fundo da página: `--paper` (#f7f6f2), nunca branco puro
- JetBrains Mono para UI (labels, títulos, badges). Inter para corpo de texto longo
- Sidebar escura (`--ink`), borda direita `2px solid var(--ink-mid)`
- Topbar branca, borda inferior `1px solid var(--line)`
- Item ativo na sidebar: `border-left: 2px solid var(--accent)`

---

## 3. COMPONENTES — REFERÊNCIA

### Status de chamado (badge)

```html
<span class="badge badge-primary">Atribuído</span>
<span class="badge badge-warning">Em Análise</span>
<span class="badge badge-success">Resolvido</span>
<span class="badge badge-danger">Crítico</span>
<span class="badge badge-neutral">Aguardando</span>
```

### Prioridade (tag uppercase)

```html
<span class="tag tag-alta">Alta</span>
<span class="tag tag-media">Média</span>
<span class="tag tag-baixa">Baixa</span>
<span class="tag tag-normal">Normal</span>
```

### Alertas — borda esquerda 3px, nunca borda inteira

```html
<div class="alert alert-info">...</div>
<div class="alert alert-success">...</div>
<div class="alert alert-warning">...</div>
<div class="alert alert-danger">...</div>
```

### Inputs — estados

```
.form-input           padrão
.form-input:focus     border: var(--ink)
.form-input.err       border: var(--color-error-bd); bg: var(--color-error-bg)
.form-input.ok        border: var(--sem-success)
.form-input:disabled  opacity: 0.4
```

Todo `<input>` precisa de `<label>` com `for/id`. Nunca usar `placeholder` como substituto de label.

---

## 4. RESPONSIVIDADE

Sistema desktop-first, mas deve funcionar em tablet (uso em campo).

```
1280px+   layout completo, sidebar 220px
1024px    sidebar icon-only (64px), labels somem
768px     sidebar vira drawer/overlay
480px     single column, tabelas com scroll horizontal
```

---

## 5. REQUISITOS FUNCIONAIS

### 5.1 Multitenancy por área

- Cada área vê apenas seus chamados
- Admin central tem Dashboard Consolidado com todas as áreas
- **Templates de chamado:** campos ativáveis/desativáveis por área
  - TI: patrimônio, IP, categoria técnica
  - SECOM: briefing, formato de entrega, canal de publicação
- **Tags globais:** transversais entre áreas para agrupar demandas de um mesmo evento (ex: `#AniversarioDaCidade`)

### 5.2 Abertura de chamado

- Formulário com **campos condicionais** — aparecem conforme a categoria selecionada
- Ao salvar, gera protocolo automático no formato `AAAA-NNNNN` (ex: `2026-00341`), imutável
- **Workflow de aprovação** (opcional por template): solicitação passa por aprovação do gestor antes de chegar à equipe técnica

### 5.3 SLAs

**TI — por criticidade:**

| Prioridade | Exemplo | Resposta | Resolução |
|---|---|---|---|
| Crítica | Servidor offline, queda de rede | 15 min | 2h |
| Alta | E-mail inoperante | 30 min | 4h |
| Média | Impressora sem rede | 2h | 8h |
| Baixa | Reset de senha | 4h | 24h |

**SECOM — por tipo de entrega:**

| Tipo | Prazo mínimo de abertura |
|---|---|
| Cobertura de evento | 3 dias úteis antes |
| Arte para redes sociais | 2 dias úteis |
| Redação de nota/release | 1 dia útil |
| Impressos / banners | 5 dias úteis |

### 5.4 Funcionalidades por área

**SECOM:**
- Calendário Editorial: visualização Kanban e Calendário dos chamados de mídia/eventos
- Brand Center: repositório de ativos linkado dentro do chamado (logos, manuais, banco de fotos)

**TI:**
- CMDB: ao informar número de patrimônio, puxa dados do ativo automaticamente
- Detecção de incidente em massa: quando N chamados do mesmo tipo abrem no intervalo X, o sistema cria chamado-pai, bloqueia duplicatas e dispara aviso em massa

### 5.5 Comunicação

- Chat interno no ticket — toda conversa fica registrada no chamado
- Notificações por e-mail em mudança de status e vencimento de SLA
- NPS automático enviado ao solicitante após encerramento do chamado

---

## 6. MODELO DE DADOS — CONCEITUAL

```
area              (id, nome, slug, tipo: secretaria|departamento, config_json)
usuario           (id, nome, email, area_id, role)
template_chamado  (id, area_id, nome, campos_json, sla_config_json)
chamado           (id, protocolo, titulo, descricao, template_id, area_id,
                   solicitante_id, tecnico_id, status, prioridade,
                   sla_prazo, aberto_em, fechado_em, parent_id)
campo_chamado     (id, chamado_id, chave, valor)
tag               (id, slug, label, cor)
chamado_tag       (chamado_id, tag_id)
mensagem          (id, chamado_id, autor_id, conteudo, criado_em)
ativo             (id, patrimonio, area_id, tipo, dados_json)
chamado_ativo     (chamado_id, ativo_id)
nps               (id, chamado_id, score, comentario, criado_em)
```

**Status do chamado (enum):**
`ABERTO` | `EM_ANALISE` | `ATRIBUIDO` | `EM_ANDAMENTO` | `RESOLVIDO` | `ENCERRADO` | `CANCELADO`

---

## 7. STACK — DEFINIDA

Modelo enxuto, roda em qualquer VPS ou hospedagem compartilhada com Node.

```
Frontend: Vite + React + TypeScript
Styling:  CSS puro com os tokens deste DS — não usar Tailwind
Backend:  Node.js + Fastify
Banco:    MySQL 8 / MariaDB 10.6+ (compatíveis entre si)
ORM:      Prisma (suporte nativo a MySQL/MariaDB)
Auth:     JWT (access token curto + refresh token em httpOnly cookie)
Deploy:   qualquer VPS com Node 20+ e MySQL — sem Docker obrigatório
```

**Por que Vite em vez de Next.js:** o sistema é uma SPA autenticada, sem necessidade de SSR ou SEO. Next.js adicionaria complexidade de deploy sem benefício real aqui.

**Multitenancy no banco:** campo `area_id` em todas as tabelas — sem schemas separados, sem multi-banco. Simples de hospedar e fazer backup.

---

## 8. MVP — ESCOPO

### Incluído

- Autenticação (login institucional)
- Abertura de chamado com formulário dinâmico (templates TI e SECOM)
- Listagem e filtros de chamados por área
- Detalhe do chamado com chat interno
- Mudança de status e atribuição a técnico
- Badge de prioridade e countdown de SLA
- Notificação por e-mail em mudança de status
- Dashboard básico (abertos / em andamento / resolvidos no mês)
- Design System aplicado conforme Seção 2

### Fora do MVP (v2+)

- Calendário Editorial (SECOM)
- CMDB / integração de ativos (TI)
- Detecção de incidente em massa
- Brand Center
- NPS automatizado
- Base de Conhecimento / wiki
- Workflow de aprovação multi-nível
- Tags globais entre áreas
- **Analytics & Intelligence** (ver Seção 11)

---

## 9. CONVENÇÕES

**Git:**
```
feat:     nova funcionalidade
fix:      correção de bug
ds:       mudança no design system
refactor: sem mudança de comportamento
```

**Checklist antes de qualquer commit:**
- Nenhuma cor hex hardcoded no CSS de componentes
- Todo elemento interativo tem `focus-visible`
- Testado em 1280px, 1024px e 768px
- Protocolo no formato `AAAA-NNNNN`
- Nenhum dado de área A visível para usuário da área B

---

## 10. FASES DE IMPLEMENTAÇÃO

> Guia de execução para maximizar paralelismo e minimizar retrabalho.
> Cada fase só começa quando a anterior estiver completa e testada.
> Dentro de cada fase, tarefas marcadas com `‖` podem ser executadas em paralelo.

---

### FASE 1 — Setup & Infraestrutura
**Dependências:** nenhuma. Todo o trabalho é paralelo.

| # | Tarefa | Caminho | Status |
|---|--------|---------|--------|
| 1.1 ‖ | Scaffold frontend: `pnpm create vite siscom-web --template react-ts` | `packages/web/` | [ ] |
| 1.2 ‖ | Scaffold backend: Fastify + TypeScript + `tsx` para dev | `packages/api/` | [ ] |
| 1.3 ‖ | Configurar Prisma: schema com todas as tabelas do modelo (Seção 6) | `packages/api/prisma/` | [ ] |
| 1.4 ‖ | Criar banco MySQL local + seed: 2 áreas (TI, SECOM), 4 usuários de teste, 2 templates | `packages/api/prisma/seed.ts` | [ ] |

**Entregável:** `pnpm dev` sobe frontend em :5173 e API em :3000. `pnpm db:seed` popula o banco sem erros.

---

### FASE 2 — Design System
**Dependências:** 1.1 concluído. Independente do backend.

| # | Tarefa | Caminho | Status |
|---|--------|---------|--------|
| 2.1 | Tokens CSS globais: arquivo `tokens.css` com o `:root` completo da Seção 2 | `src/styles/tokens.css` | [ ] |
| 2.2 | Componentes base: `Badge`, `Tag`, `Alert`, `FormInput` conforme Seção 3 | `src/components/ui/` | [ ] |
| 2.3 | `AppShell`: layout com Sidebar escura + Topbar branca, slots para conteúdo | `src/components/layout/` | [ ] |
| 2.4 | Responsividade: media queries para 1024px (icon-only) e 768px (drawer) | dentro do AppShell | [ ] |

**Entregável:** página de demonstração em `/ds` exibe todos os componentes nos 3 breakpoints. Zero hex hardcoded fora de `tokens.css`.

---

### FASE 3 — Autenticação
**Dependências:** Fase 1 completa.

| # | Tarefa | Caminho | Status |
|---|--------|---------|--------|
| 3.1 ‖ BE | `POST /auth/login` — valida email+senha, devolve access token (15 min) + seta httpOnly cookie com refresh token | `api/src/routes/auth.ts` | [ ] |
| 3.1 ‖ BE | `POST /auth/refresh` — troca refresh token por novo access token | `api/src/routes/auth.ts` | [ ] |
| 3.1 ‖ BE | `POST /auth/logout` — limpa cookie | `api/src/routes/auth.ts` | [ ] |
| 3.2 ‖ BE | Middleware `authenticate`: valida JWT e injeta `req.user` (id, area_id, role) em todas as rotas protegidas | `api/src/middleware/` | [ ] |
| 3.3 ‖ FE | Página `/login`: formulário com email + senha, usando `FormInput` do DS | `src/pages/Login.tsx` | [ ] |
| 3.4 ‖ FE | `AuthContext` + `useAuth` hook: armazena access token em memória, renova via refresh silencioso | `src/contexts/AuthContext.tsx` | [ ] |
| 3.5 ‖ FE | `ProtectedRoute`: redireciona para `/login` se não autenticado | `src/router/` | [ ] |

**Entregável:** login funcional, token renovado automaticamente, logout limpa sessão. Rota protegida redireciona sem autenticação.

---

### FASE 4 — Core de Chamados
**Dependências:** Fase 3 completa.

| # | Tarefa | Caminho | Status |
|---|--------|---------|--------|
| 4.1 ‖ BE | `GET /chamados` — lista chamados da área do usuário (filtros: status, prioridade, técnico, busca por protocolo/título) | `api/src/routes/chamados.ts` | [ ] |
| 4.2 ‖ BE | `POST /chamados` — abre chamado, gera protocolo `AAAA-NNNNN`, calcula `sla_prazo` pelo template | `api/src/routes/chamados.ts` | [ ] |
| 4.3 ‖ BE | `GET /chamados/:id` — detalhe completo (campos dinâmicos + mensagens) | `api/src/routes/chamados.ts` | [ ] |
| 4.4 ‖ BE | `GET /templates?area_id=` — retorna template com `campos_json` e `sla_config_json` | `api/src/routes/templates.ts` | [ ] |
| 4.5 ‖ FE | Formulário de abertura: carrega template da área, renderiza campos condicionais conforme categoria selecionada | `src/pages/NovoChamado.tsx` | [ ] |
| 4.6 ‖ FE | Listagem de chamados: tabela com filtros, badge de status, tag de prioridade, countdown de SLA | `src/pages/Chamados.tsx` | [ ] |
| 4.7 ‖ FE | Detalhe do chamado: header com protocolo + meta, seção de campos, chat, sidebar de ações | `src/pages/Chamado.tsx` | [ ] |

**Entregável:** fluxo completo — abrir chamado → ver na listagem → abrir detalhe. Protocolo gerado corretamente. Campos TI e SECOM distintos conforme template.

---

### FASE 5 — Interações & SLA
**Dependências:** Fase 4 completa.

| # | Tarefa | Caminho | Status |
|---|--------|---------|--------|
| 5.1 ‖ BE | `PATCH /chamados/:id/status` — muda status, valida transições permitidas, registra `fechado_em` | `api/src/routes/chamados.ts` | [ ] |
| 5.2 ‖ BE | `PATCH /chamados/:id/atribuir` — atribui técnico (apenas técnico/admin da mesma área) | `api/src/routes/chamados.ts` | [ ] |
| 5.3 ‖ BE | `POST /chamados/:id/mensagens` + `GET /chamados/:id/mensagens` — chat interno | `api/src/routes/mensagens.ts` | [ ] |
| 5.4 ‖ FE | Chat no detalhe: input de mensagem, lista com autor + timestamp, polling a cada 15s | `src/components/Chat.tsx` | [ ] |
| 5.5 ‖ FE | Painel de ações: dropdown de mudança de status, select de atribuição, bloqueado por role | `src/components/PainelAcoes.tsx` | [ ] |
| 5.6 ‖ FE | `SlaCountdown`: componente que exibe tempo restante, muda cor ao atingir 50% e 0% do prazo | `src/components/SlaCountdown.tsx` | [ ] |

**Entregável:** técnico pode receber chamado, responder via chat e fechar. Countdown de SLA visível e reativo.

---

### FASE 6 — Notificações & Dashboard
**Dependências:** Fase 5 completa.

| # | Tarefa | Caminho | Status |
|---|--------|---------|--------|
| 6.1 ‖ BE | Job de SLA: cron a cada 5 min, verifica chamados vencidos, dispara e-mail de alerta | `api/src/jobs/slaChecker.ts` | [ ] |
| 6.2 ‖ BE | Hook de status: ao mudar status, envia e-mail ao solicitante com novo estado e link do chamado | `api/src/hooks/statusNotifier.ts` | [ ] |
| 6.3 ‖ BE | `GET /dashboard` — agrega: abertos / em andamento / resolvidos no mês, por área (admin vê todas) | `api/src/routes/dashboard.ts` | [ ] |
| 6.4 ‖ FE | Dashboard: cards de métricas + lista dos 5 chamados mais urgentes (SLA mais próximo) | `src/pages/Dashboard.tsx` | [ ] |

**Entregável:** e-mail disparado em mudança de status e vencimento de SLA. Dashboard exibe números reais do banco.

---

### Ordem de dependências resumida

```
Fase 1 (paralela internamente)
  └─ Fase 2 (depende de 1.1) ─────────────────────────────────┐
  └─ Fase 3 (depende de 1 completa)                            │
       └─ Fase 4 (depende de 3)                                │
            └─ Fase 5 (depende de 4)                           │
                 └─ Fase 6 (depende de 5)                      │
                                                               ▼
                                              DS pronto antes de qualquer tela
```

### Regras para execução eficiente

- Sempre implementar o endpoint BE antes de conectar o FE — evita mocks descartáveis
- Nunca avançar de fase com checklist de entregável incompleto
- Tarefas `‖` dentro de uma fase podem ser delegadas a agentes paralelos
- Seed do banco deve cobrir todos os cenários de teste antes de implementar qualquer rota

---

---

## 11. ANALYTICS & INTELLIGENCE (v2+)

> Módulo de inteligência sobre os dados do sistema. Foco em decisão gerencial,
> identificação de gargalos e reconhecimento de performance. Visual extravagante,
> dados sérios.

### 11.1 Biblioteca de gráficos

```
Recharts — composable, baseada em SVG, integra bem com React
Sem D3 direto — complexidade desnecessária para este escopo
```

### 11.2 Painel Executivo — `/analytics`

Acessível apenas para `gestor` e `admin`. Layout em grid denso, estilo "war room".

#### Bloco 1 — Visão geral (cards + sparklines)

| Métrica | Tipo | Detalhe |
|---|---|---|
| Total de chamados no período | `<AreaChart>` sparkline | filtro: 7d / 30d / 90d |
| Taxa de resolução no SLA | `<RadialBarChart>` gauge | % dentro do prazo |
| Tempo médio de resolução | número + delta vs período anterior | por área |
| Chamados críticos em aberto | número com pulso animado se > 0 | link direto |

#### Bloco 2 — Rankings (os mais "extravagantes")

**Top Secretarias / Áreas — quem mais abre chamados**
```
<BarChart horizontal> com animação stagger na entrada
Colunas coloridas pelo token de cada área
Tooltip com breakdown: abertos / resolvidos / vencidos
```

**Top Solicitantes — quem mais requisita**
```
<BarChart> + avatar inicial do usuário no eixo Y
Filtro por área
Flag visual se usuário abriu > 2x a média (outlier)
```

**Top Técnicos — quem mais resolve**
```
<BarChart> com métrica composta: volume × taxa de SLA cumprido
Badge "MVP do mês" para o primeiro colocado
```

**Top Categorias (TI) / Tipos de entrega (SECOM)**
```
<TreeMap> ou <PieChart> com donut
Revela o que mais consome a equipe
```

#### Bloco 3 — Análise temporal

**Heatmap de volume por hora × dia da semana**
```
Grid 7×24 com intensidade de cor (variação de --paper-dark → --ink)
Revela picos de demanda — base para escala de plantão
```

**Evolução do SLA no tempo**
```
<LineChart> com duas linhas: prazo médio vs. resolução média
Área entre as linhas colorida: verde se dentro, vermelho se fora
```

**Chamados abertos por status ao longo do tempo**
```
<AreaChart> empilhado (stacked)
Cada status com a cor do badge correspondente
```

#### Bloco 4 — Alertas inteligentes (cartões de insight)

Gerados automaticamente pela API com base em thresholds configuráveis:

| Insight | Condição | Visual |
|---|---|---|
| Pico de demanda | volume hoje > média + 2σ | card `alert-warning` com seta |
| Técnico sobrecarregado | > N chamados ativos para 1 técnico | card `alert-danger` |
| SLA sistêmico em risco | taxa de SLA < 70% nos últimos 7d | card `alert-danger` pulsando |
| Área sem atividade | área sem chamado há X dias | card `alert-info` |
| Recorde positivo | melhor taxa de resolução do mês | card `alert-success` com troféu |

### 11.3 Endpoints necessários (API)

```
GET /analytics/resumo?periodo=30d&area_id=
GET /analytics/top-areas?periodo=30d
GET /analytics/top-solicitantes?periodo=30d&area_id=
GET /analytics/top-tecnicos?periodo=30d&area_id=
GET /analytics/top-categorias?periodo=30d&area_id=
GET /analytics/heatmap?periodo=90d&area_id=
GET /analytics/sla-evolucao?periodo=30d&area_id=
GET /analytics/alertas
```

Todas as queries rodam sobre a tabela `chamado` com `GROUP BY` e `DATE_TRUNC`.
Nenhum dado externo — 100% derivado do banco.

### 11.4 Filtros globais do painel

```
[Período    ▼]  [Área  ▼]  [Técnico ▼]   [Exportar PDF]
  7d / 30d / 90d / custom
```

Exportar PDF: `window.print()` com `@media print` dedicado — sem biblioteca extra.

### 11.5 Tokens visuais dos gráficos

```css
/* Paleta de séries — derivada dos tokens existentes */
--chart-1: var(--accent);       /* #0066cc */
--chart-2: var(--sem-success);  /* #4a6741 */
--chart-3: var(--sem-warning);  /* #7a5c1e */
--chart-4: var(--sem-danger);   /* #6b2233 */
--chart-5: var(--ink-soft);     /* #5262c4 */
--chart-grid: var(--line);      /* #d4d2cc */
--chart-tooltip-bg: var(--ink); /* #0d1433 */
```

Nenhuma cor nova — tudo derivado do DS existente. Gráficos falam a mesma língua visual do sistema.

### 11.6 Fase de implementação (dentro do roadmap)

Inserir como **Fase 7** após o MVP completo:

| # | Tarefa | Status |
|---|--------|--------|
| 7.1 BE | Endpoints `/analytics/*` com queries otimizadas | [ ] |
| 7.2 FE | Instalar Recharts: `pnpm add recharts` | [ ] |
| 7.3 FE | Tokens CSS dos gráficos em `tokens.css` | [ ] |
| 7.4 FE | Componentes: `BarChart`, `AreaChart`, `HeatmapGrid`, `InsightCard` | [ ] |
| 7.5 FE | Página `/analytics` com todos os blocos e filtros globais | [ ] |
| 7.6 FE | `@media print` para exportação PDF | [ ] |

**Entregável:** gestor abre `/analytics`, filtra por período e área, vê rankings em tempo real e exporta relatório em PDF sem dependência externa.

---

*Jaguariaíva, PR · Abril 2026*
