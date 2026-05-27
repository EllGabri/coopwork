# CoopWork — Plataforma de Gestão Corporativa para Cooperativas de Crédito

**Versão**: 1.0.0  
**Data**: 2026-05-26  
**Status**: Aprovado para desenvolvimento

---

## Visão do Produto

Plataforma web corporativa para cooperativas de crédito integrando:
- **Gerenciamento de projetos e tarefas** (estilo Monday.com) com drag-and-drop, personalização RGB e modo escuro
- **GED** (Gestão Eletrônica de Documentos) com controle de acesso granular e ciclo de vida da informação
- **IA assistente** para sugestão de tarefas, identificação de melhorias e geração de relatórios
- **Multi-tenant com RBAC** e segregação por cargo
- **Painel admin** para controle de parâmetros do sistema

**Capacidade**: 200 colaboradores simultâneos  
**Desenvolvimento**: Claude Code como desenvolvedor principal  
**Deploy**: Free tier (Vercel + Railway + Supabase) → upgrade-ready para cloud enterprise

---

## Stack Técnica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Frontend | React 18 + TypeScript + Vite | Ecosistema maduro, tipagem forte |
| Estilo | Tailwind CSS + shadcn/ui | Componentes acessíveis, dark mode nativo |
| Drag & Drop | @dnd-kit/core | Acessível, performático |
| Backend | Node.js + NestJS + TypeScript | Modular, decorators para RBAC |
| Banco | PostgreSQL via Supabase | Free tier robusto, Row Level Security |
| Auth | Supabase Auth + Google OAuth2 | Google Workspace SSO, sem senha própria |
| Storage | Supabase Storage (AES-256) | Documentos GED criptografados em repouso |
| Realtime | Supabase Realtime (WebSocket) | Atualizações ao vivo de cards/boards |
| IA | Anthropic Claude API (Haiku) | Custo mínimo, capaz para sugestões |
| Cache/Fila | Redis (Railway add-on) | Sessões, rate limiting, 200 usuários simultâneos |
| Deploy FE | Vercel (free) | CDN global, preview por PR |
| Deploy BE | Railway (free $5/mês) | Auto-deploy, env vars, logs |

---

## Módulos do Sistema

### 1. IAM — Autenticação e Controle de Acesso

**Autenticação:**
- Login exclusivo via Google Workspace OAuth2 (Supabase Auth)
- Credenciais nunca trafegam: fluxo PKCE do OAuth2 elimina senha própria
- JWT armazenados como `httpOnly` cookies (não acessíveis via JS)
- Refresh token rotation automática

**Papéis (RBAC):**

| Role | Descrição | Módulos |
|------|-----------|---------|
| `super_admin` | Painel admin completo | Todos + admin |
| `director` | Diretor executivo | Todos os módulos |
| `manager` | Gestor de departamento | Projetos + GED leitura + relatórios do setor |
| `compliance` | Analista compliance | GED completo + auditorias + relatórios |
| `assistant` | Colaborador operacional | Projetos/tarefas do seu departamento (sem GED) |

Permissões customizáveis por `super_admin`: liberar/bloquear menus por role via painel admin.

---

### 2. Gerenciamento de Projetos e Tarefas

**Hierarquia:** Workspace → Board → Coluna → Card

**Funcionalidades:**
- Drag-and-drop de cards entre colunas e boards
- Cards com: título, descrição, responsável(is), prazo, prioridade (baixa/média/alta/crítica), cor RGB customizável, anexos, comentários, checklists, tags
- Visualizações por board: Kanban, Lista, Calendário, Gantt (simplificado)
- Filtros: por responsável, prazo, prioridade, tag, departamento
- Notificações em tempo real via WebSocket (atribuição, comentário, prazo)
- Personalização RGB: cor do board, cor de cada coluna, cor de card
- Modo escuro/claro persistido por usuário (localStorage + servidor)
- Workspaces por departamento (visibilidade segmentada por role)

---

### 3. GED — Gestão Eletrônica de Documentos

**Sub-módulos:**

| Sub-módulo | Descrição |
|-----------|-----------|
| Instruções de Trabalho | POPs, procedimentos operacionais |
| Auditorias | Registros, evidências, planos de ação |
| Departamentos | Estrutura organizacional, organograma |
| Processos | Fluxogramas (React Flow embedded) |
| Manuais | Documentação técnica e operacional |
| Reuniões | Atas, pautas, participantes, deliberações |
| Problemas e Riscos | Matriz de risco, planos de mitigação |
| Planejamento Orçamentário | Planilhas, projeções, aprovações |
| Oportunidades (IA) | Sugestões de melhoria/automação geradas pela IA |
| Relatórios | Por setor, equipe, departamento |
| Ciclo de Vida | Versionamento, datas de revisão, expiração, arquivamento |

**Segurança de Documentos:**
- Criptografia em trânsito: HTTPS/TLS 1.3 obrigatório
- Criptografia em repouso: Supabase Storage com AES-256
- ACL por documento: visibilidade por role + por usuário específico
- Auditoria de acesso: log de quem acessou, baixou, editou (data, IP, user-agent)
- Restrição de download configável por role
- Watermark automático em PDFs baixados (nome do usuário + data)
- Sem indexação por buscadores (headers `X-Robots-Tag: noindex`)

---

### 4. IA Assistente (Claude Haiku)

**Capacidades:**
- Sugestão de próximas tarefas com base no contexto do projeto e prazo
- Identificação de gargalos e oportunidades de automação
- Geração de rascunho de relatórios a partir de dados do sistema
- Análise de riscos em projetos (inputs: prazo, dependências, histórico)
- Resumo automático de reuniões (ata → bullets de deliberações)
- Revisão gramatical/estrutural de documentos GED

**Implementação:**
- Prompts com contexto injetado via system prompt (dados do projeto/usuário)
- Rate limiting por usuário (evitar custo excessivo): 20 chamadas/hora
- Respostas persistidas em `ai_suggestions` para auditoria
- Custo estimado: ~$0.005 por sugestão com Haiku

---

### 5. Painel Admin

- Rota protegida: `/admin` com autenticação de `super_admin` + 2FA (TOTP via Authenticator)
- **Gerenciamento de usuários**: criar, desativar, alterar role
- **Controle de menus**: matrix de visibilidade (role × módulo) editável via UI
- **Exclusão/arquivamento de tarefas**: com soft-delete e log
- **Parâmetros do sistema**: tamanho máx. de upload, políticas de sessão, features flags, limite de IA por usuário
- **Logs de auditoria**: timeline de eventos do sistema filtráveis
- **Monitoramento**: usuários ativos agora, storage usado, chamadas de IA no mês

---

### 6. Relatórios

- Por setor, equipe, departamento
- Tipos: tarefas (concluídas/em andamento/atrasadas), documentos GED, riscos, orçamento
- Exportação: PDF e Excel (.xlsx)
- Agendamento: relatórios automáticos semanais/mensais por e-mail
- Geração assistida por IA (narrativa sobre os dados)

---

## Modelo de Dados (alto nível)

```
tenants            — preparado para multi-tenant futuro
users              — colaboradores (vinculados ao Google Workspace)
roles              — super_admin, director, manager, compliance, assistant
permissions        — matrix role × módulo
departments        — departamentos da cooperativa
workspaces         — ambientes por departamento
boards             — quadros kanban
board_columns      — colunas do quadro
cards              — tarefas/cards
card_attachments   — anexos de cards
card_comments      — comentários
documents          — documentos GED
document_versions  — histórico de versões
document_categories— categorias do GED
document_access_log— auditoria de acesso a documentos
audit_logs         — auditoria geral do sistema
ai_suggestions     — sugestões persistidas da IA
notifications      — notificações in-app
user_preferences   — tema, idioma, configurações do usuário
```

---

## Requisitos Não-Funcionais

| Requisito | Meta | Estratégia |
|-----------|------|-----------|
| Usuários simultâneos | 200 | pgBouncer (Supabase), Redis cache, horizontal scaling |
| Tempo de resposta | < 2s (leitura) | Índices PostgreSQL, Redis cache L1 |
| Disponibilidade | 99.5%+ | Vercel CDN + Supabase SLA |
| Segurança senhas | Nunca trafegam | OAuth2 PKCE, sem auth por senha |
| Criptografia | TLS 1.3 + AES-256 | Supabase nativo + HTTPS forçado |
| LGPD | Compliance | Política de retenção, direito ao esquecimento, DPO registrado |
| Backups | 7 dias | Supabase daily backups (free) → PITR no upgrade |

---

## Deploy: Free Tier → Upgrade Path

### Free Tier (MVP)

| Componente | Serviço | Limite Free |
|-----------|---------|-------------|
| Frontend | Vercel | Ilimitado (hobby) |
| Backend API | Railway | $5 crédito/mês (~500h execução) |
| PostgreSQL | Supabase | 500MB, 50k req/dia |
| Storage GED | Supabase Storage | 1GB |
| Auth | Supabase Auth | 50k MAU |
| Redis | Railway Redis | Free add-on |

### Upgrade Path (quando necessário)

| Componente | Upgrade | Custo estimado |
|-----------|---------|----------------|
| PostgreSQL | Supabase Pro | $25/mês (8GB + PITR) |
| Backend | Railway Developer | $5-20/mês |
| Storage | Supabase Pro | 100GB incluídos |
| CDN | Cloudflare Free | $0 (adicionar ao Vercel) |
| Escala alta | AWS ECS + RDS | $100-300/mês |

---

## Não está no escopo (v1.0)

- Aplicativo mobile nativo (responsivo cobre mobile)
- Integração com sistemas bancários core
- Videoconferência integrada
- Cobrança/billing para outros tenants
- Chat em tempo real (apenas comentários em cards)
