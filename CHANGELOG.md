# Changelog

All notable changes to CoopWork will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-05-28

### Added

#### Phase 1 — Fundação

- Monorepo com `apps/web` (React+Vite), `apps/api` (NestJS), `packages/shared`
- ESLint, Prettier, TypeScript strict, Husky pre-commit
- Supabase: PostgreSQL, Auth (Google OAuth), Storage bucket `ged-documents` com RLS
- Schema inicial: `tenants`, `users`, `roles`, `permissions`, `departments`, `user_preferences` com RLS
- Docker Compose para desenvolvimento local (PostgreSQL + Redis)
- `.env.example` com todas as variáveis documentadas

#### Phase 2 — Autenticação e IAM

- Login via Google OAuth2 — cookie `access_token` httpOnly
- `JwtAuthGuard` — valida token a cada request, popula `req.user`
- `RolesGuard` + decorator `@Roles(...)` — RBAC com matrix de permissões do banco
- Tela de login `/login` com botão "Entrar com Google Workspace"
- CRUD de usuários pelo `super_admin`
- Logout via `POST /auth/logout` — limpa cookie

#### Phase 3 — Gerenciamento de Projetos

- Workspaces, Boards, Colunas e Cards com CRUD completo
- Drag-and-drop de cards com `@dnd-kit/core`
- Sincronização em tempo real via Supabase Realtime (`< 1s`)
- Visualizações: Kanban, Lista (tabela ordenável) e Calendário (`react-big-calendar`)
- Modal de card: edição inline, checklist, comentários com @mention, anexos (< 10 MB)
- Notificações via WebSocket — badge no sino, marcar como lida

#### Phase 4 — UI/UX

- Dark mode / light mode com persistência no banco e `localStorage` (sem flash)
- `ColorPicker` com input HEX, sliders RGB e paleta rápida
- Layout estilo Monday.com: sidebar recolhível, breadcrumbs, busca global
- Animações, skeleton loaders e toast notifications
- Página de perfil `/profile` com avatar Google e histórico de atividade

#### Phase 5 — GED

- Upload seguro para Supabase Storage (bucket privado); URL assinada com TTL 1h
- Versionamento de documentos — histórico e restauração de versões
- Log de auditoria: acesso, download, edição, exclusão com IP e timestamp
- Watermark automático em PDFs baixados (`pdf-lib`)
- Busca full-text (`tsvector`) e filtros por categoria/departamento/data
- Editor de fluxogramas com React Flow
- Ciclo de vida: job `@Cron` diário com e-mail de aviso 30 dias antes da expiração
- ACL por documento — compartilhar com usuário específico além do RBAC

#### Phase 6 — IA Assistente (Claude)

- `AiModule` com Anthropic SDK, rate limit Redis 20 chamadas/hora por usuário
- Sugestão de próximas tarefas (3 cards com título, descrição e prioridade)
- Análise de riscos do projeto com severidade e sugestão de mitigação
- Oportunidades de melhoria no GED
- Resumo de atas com bullets de deliberações e criação de cards
- Narrativa executiva de relatórios em português corporativo

#### Phase 7 — Painel Admin

- `/admin` com dupla autenticação: JWT `super_admin` + TOTP (speakeasy)
- Gerenciamento de usuários: alterar role, ativar/desativar, forçar logout (blacklist Redis)
- Matrix de permissões role × módulo com cache 30s
- Soft-delete de cards com restauração em até 30 dias
- Parâmetros do sistema: limite de upload, TTL de URL, rate limit IA
- Dashboard: usuários ativos (Redis SET), storage GED, tokens IA do mês, top boards

#### Phase 8 — Relatórios

- Endpoints de relatório com queries parametrizadas (< 2s para 10 k registros)
- Interface com seletor de tipo, filtros, gráficos `recharts` e tabela paginada
- Exportação PDF com `@react-pdf/renderer` (logo, filtros, gráficos)
- Exportação Excel com `exceljs` (abas Dados + Sumário)
- Relatórios agendados via `@Cron` + `nodemailer` com PDF em anexo

#### Phase 9 — Segurança e Escala

- Rate limiting global com `@nestjs/throttler` + Redis store
- `helmet` (HSTS, X-Frame-Options, CSP), CORS restrito, headers de stack removidos
- Todos os DTOs com `class-validator` + `class-transformer`; HTML sanitizado
- PgBouncer connection pooling; teste k6 200 VUs / 60s (p95 < 2s, 0 erros 5xx)
- Audit log global em `audit_logs` com `old_value` / `new_value`
- 0 vulnerabilidades críticas ou altas no `npm audit`

#### Phase 10 — Deploy e Monitoramento

- Deploy frontend no Vercel; deploy backend no Railway com health check
- Domínio customizado + SSL (Let's Encrypt); HTTP → HTTPS redirect; HSTS preload
- CI/CD GitHub Actions: lint + type-check + build em PRs; deploy automático no merge para `main`
- Sentry integrado no frontend e backend; alertas para erros 5xx e de autenticação
- Script `pnpm db:seed` idempotente — 1 tenant, 5 usuários (1/role), 2 workspaces, 5 boards, 11 categorias GED

---

[1.0.0]: https://github.com/your-org/coopwork/releases/tag/v1.0.0
