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

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend | Node.js + NestJS + TypeScript |
| Banco | PostgreSQL via Supabase |
| Auth | Supabase Auth + Google Workspace OAuth2 |
| Storage GED | Supabase Storage (AES-256) |
| IA | Anthropic Claude Haiku API |
| Realtime | Supabase Realtime (WebSocket) |
| Deploy | Vercel (web) + Railway (api) + Supabase (DB/Storage) |

## Como começar

### Pré-requisitos

- Node.js 18+
- pnpm (instalar com `npm install -g pnpm`)
- Docker + Docker Compose (para banco local)
- Conta Supabase gratuita
- Chave API Anthropic

### Setup inicial

1. **Clonar o repositório**
   ```bash
   cd C:\Users\Gabriel\Desktop\Claude_Code\HighPerson\Produtos\Northv
   ```

2. **Instalar dependências**
   ```bash
   pnpm install
   ```

3. **Copiar variáveis de ambiente**
   ```bash
   cp .env.example .env.local
   ```

4. **Preencher .env.local com suas chaves** (Supabase, Claude API, Google OAuth)

5. **Iniciar banco local (Docker)**
   ```bash
   docker-compose up -d
   ```

6. **Executar migrations**
   ```bash
   pnpm db:push
   ```

7. **Iniciar dev server**
   ```bash
   pnpm dev
   ```

- Frontend: http://localhost:5173
- API: http://localhost:3001
- Supabase Studio: http://localhost:54323

## Arquivos de Planejamento

- **[spec.md](spec.md)** — Contrato do produto (visão, arquitetura, requisitos)
- **[Plans.md](Plans.md)** — Ledger de tarefas (46 tasks em 10 fases com DoD)

Leia `spec.md` primeiro para entender a visão. Use `Plans.md` como referência de tarefas durante o desenvolvimento.

## Fases de Desenvolvimento

| Fase | Tarefas | Status |
|------|---------|--------|
| Phase 1 — Fundação | 5 | cc:TODO |
| Phase 2 — Autenticação/IAM | 6 | cc:TODO |
| Phase 3 — Task Management | 9 | cc:TODO |
| Phase 4 — UI/UX | 6 | cc:TODO |
| Phase 5 — GED | 9 | cc:TODO |
| Phase 6 — IA Assistente | 6 | cc:TODO |
| Phase 7 — Admin Panel | 6 | cc:TODO |
| Phase 8 — Relatórios | 5 | cc:TODO |
| Phase 9 — Segurança/Escala | 6 | cc:TODO |
| Phase 10 — Deploy/CI | 6 | cc:TODO |

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
