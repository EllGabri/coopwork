# Northv — Plataforma de Gestão Corporativa

Plataforma web corporativa para cooperativas de crédito, integrando gerenciamento de projetos/tarefas (estilo Monday.com), GED (Gestão Eletrônica de Documentos), IA assistente e controle de acesso multi-tenant.

## Estrutura do Projeto

```
Northv/
├── spec.md                 # Product contract — definição do que é correto
├── Plans.md                # Task ledger — lista de tarefas com DoD
├── .gitignore              # Configuração Git
├── README.md               # Este arquivo
├── apps/
│   ├── web/               # Frontend React + TypeScript
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   └── App.tsx
│   │   └── package.json
│   └── api/               # Backend NestJS + TypeScript
│       ├── src/
│       │   ├── modules/
│       │   ├── guards/
│       │   └── main.ts
│       └── package.json
├── packages/
│   └── shared/            # Tipos TypeScript compartilhados
│       ├── types/
│       └── package.json
├── docker-compose.yml      # Desenvolvimento local
└── pnpm-workspace.yaml     # Configuração do monorepo
```

## Stack Técnica

| Camada      | Tecnologia                                              |
| ----------- | ------------------------------------------------------- |
| Frontend    | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend     | Node.js + NestJS + TypeScript                           |
| Banco       | PostgreSQL via Supabase                                 |
| Auth        | Supabase Auth + Google Workspace OAuth2                 |
| Storage GED | Supabase Storage (AES-256)                              |
| IA          | Anthropic Claude Haiku API                              |
| Realtime    | Supabase Realtime (WebSocket)                           |
| Deploy      | Vercel (web) + Railway (api) + Supabase (DB/Storage)    |

## Como começar

### Pré-requisitos

- Node.js 18+
- pnpm (instalar com `npm install -g pnpm`)
- Docker + Docker Compose (para banco local)
- Conta Supabase gratuita
- Chave API Anthropic

### Setup inicial

**Pre-requisitos**: Node.js 20+, pnpm 9+, Docker

1. **Instalar dependencias**

   ```bash
   pnpm install
   ```

2. **Copiar e preencher variaveis de ambiente**

   ```bash
   cp .env.example .env.local
   # Edite .env.local com suas credenciais reais
   ```

3. **Iniciar banco local**

   ```bash
   docker-compose up -d
   pnpm db:push
   ```

4. **Iniciar dev server**
   ```bash
   pnpm dev
   ```

- Frontend: http://localhost:5173
- API: http://localhost:3001
- Supabase Studio: http://localhost:54323

### Onde obter cada credencial

| Variavel                                                         | Onde obter                                                                        |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | supabase.com -> Dashboard -> Project Settings -> API                              |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                       | Google Cloud Console -> APIs & Services -> Credentials -> OAuth 2.0 Client        |
| `ANTHROPIC_API_KEY`                                              | console.anthropic.com -> Settings -> API Keys                                     |
| `JWT_SECRET`                                                     | Gerar: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `REDIS_URL`                                                      | Local: `docker run -d -p 6379:6379 redis` - redis://localhost:6379                |
| `SMTP_*`                                                         | Qualquer SMTP (Gmail, SendGrid, Resend, etc.)                                     |

> **Atencao**: Nunca comite arquivos `.env` reais. Apenas `.env.example` e versionado.

## Arquivos de Planejamento

- **[spec.md](spec.md)** — Contrato do produto (visão, arquitetura, requisitos)
- **[Plans.md](Plans.md)** — Ledger de tarefas (46 tasks em 10 fases com DoD)

Leia `spec.md` primeiro para entender a visão. Use `Plans.md` como referência de tarefas durante o desenvolvimento.

## Fases de Desenvolvimento

| Fase                       | Tarefas | Status  |
| -------------------------- | ------- | ------- |
| Phase 1 — Fundação         | 5       | cc:TODO |
| Phase 2 — Autenticação/IAM | 6       | cc:TODO |
| Phase 3 — Task Management  | 9       | cc:TODO |
| Phase 4 — UI/UX            | 6       | cc:TODO |
| Phase 5 — GED              | 9       | cc:TODO |
| Phase 6 — IA Assistente    | 6       | cc:TODO |
| Phase 7 — Admin Panel      | 6       | cc:TODO |
| Phase 8 — Relatórios       | 5       | cc:TODO |
| Phase 9 — Segurança/Escala | 6       | cc:TODO |
| Phase 10 — Deploy/CI       | 6       | cc:TODO |

**Total**: ~50-58 sessões estimadas

## Desenvolvimento com Claude Code

```bash
# Iniciar nova sessão e começar pela Phase 1
claude
/harness-work 1.1
```

## Licença

Interno — Cooperativa de Crédito

---

**Última atualização**: 2026-05-26
