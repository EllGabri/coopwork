# Guia de Teste — CoopWork v1.0.0

## Situação atual

| Item                                       | Status                       |
| ------------------------------------------ | ---------------------------- |
| Código                                     | 100% completo (64/64 tasks)  |
| Deploy produção                            | Vercel (web) + Railway (API) |
| Banco                                      | Supabase cloud configurado   |
| Credenciais que **você** precisa preencher | Ver Passo 2 abaixo           |

---

## Opção A — Testar em produção (mais rápido)

Se o deploy já está ativo no Vercel, acesse a URL de produção diretamente.
Você precisará apenas configurar o Google OAuth apontando para o domínio de produção.

---

## Opção B — Testar localmente

### Pré-requisitos

- [ ] Node.js 20+ instalado
- [ ] pnpm instalado (`npm install -g pnpm`)
- [ ] Docker Desktop instalado e rodando (para PostgreSQL e Redis locais)

---

### Passo 1 — Copiar arquivos de ambiente

Execute no terminal (na raiz do projeto):

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env.local
```

---

### Passo 2 — Preencher credenciais

Abra `apps/api/.env.local` e preencha os itens marcados com `⚠️`:

| Variável                    | Como obter                                                                                               | Obrigatória para testar             |
| --------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `SUPABASE_URL`              | supabase.com → seu projeto → Settings → API                                                              | ✅ Já tem                           |
| `SUPABASE_ANON_KEY`         | mesmo lugar                                                                                              | ✅ Já tem                           |
| `SUPABASE_SERVICE_ROLE_KEY` | mesmo lugar                                                                                              | ✅ Já tem                           |
| `DATABASE_URL` ⚠️           | Supabase → Settings → Database → Connection string → URI                                                 | ✅ Sim                              |
| `GOOGLE_CLIENT_ID` ⚠️       | [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 | ✅ Sim (login)                      |
| `GOOGLE_CLIENT_SECRET` ⚠️   | mesmo lugar                                                                                              | ✅ Sim (login)                      |
| `JWT_SECRET`                | já gerado (`2475ab98...`)                                                                                | ✅ Já tem                           |
| `REDIS_URL`                 | docker-compose sobe automaticamente                                                                      | ✅ Docker resolve                   |
| `ANTHROPIC_API_KEY` ⚠️      | [console.anthropic.com](https://console.anthropic.com) → API Keys                                        | Só para funcionalidades de IA       |
| `SMTP_*` ⚠️                 | [mailtrap.io](https://mailtrap.io) (grátis, para capturar e-mails de teste)                              | Só para e-mail/relatórios agendados |

Abra `apps/web/.env.local` e preencha:

| Variável                 | Valor                   |
| ------------------------ | ----------------------- |
| `VITE_SUPABASE_URL`      | mesma URL do Supabase   |
| `VITE_SUPABASE_ANON_KEY` | mesma ANON_KEY          |
| `VITE_API_URL`           | `http://localhost:3001` |

---

### Passo 3 — Como obter o DATABASE_URL do Supabase

1. Acesse [supabase.com](https://supabase.com) → seu projeto
2. Vá em **Project Settings → Database**
3. Clique em **Connection string** → selecione **URI**
4. Copie a string (formato: `postgresql://postgres.[ref]:[senha]@...`)
5. Cole em `DATABASE_URL=` no `apps/api/.env.local`

---

### Passo 4 — Como configurar o Google OAuth

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto (ou use um existente)
3. Vá em **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Tipo: **Web application**
5. Adicione em **Authorized redirect URIs**:
   - `http://localhost:3001/auth/google/callback` (para testes locais)
   - `https://sua-api.railway.app/auth/google/callback` (para produção)
6. Copie `Client ID` e `Client Secret` para o `.env.local`

---

### Passo 5 — Subir os serviços e rodar

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir PostgreSQL e Redis (Docker)
pnpm db:up

# 3. Rodar as migrations do banco
#    (conecta via DATABASE_URL no apps/api/.env.local)
pnpm db:seed

# 4. Iniciar frontend + backend em paralelo
pnpm dev
```

Acesse:

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001
- **API Health**: http://localhost:3001/health

---

## Roteiro de teste — fluxo principal

### 1. Login

- [ ] Acessar http://localhost:5173
- [ ] Clicar em "Entrar com Google Workspace"
- [ ] Logar com conta Google
- [ ] Redireciona para `/dashboard` ✓

### 2. Kanban

- [ ] Criar um novo workspace
- [ ] Criar um board dentro do workspace
- [ ] Criar colunas (ex: "A fazer", "Em andamento", "Concluído")
- [ ] Criar cards e arrastar entre colunas
- [ ] Abrir outro browser/aba no mesmo board → card move em tempo real (Realtime)

### 3. GED

- [ ] Acessar módulo GED na sidebar
- [ ] Fazer upload de um PDF
- [ ] Fazer download → verificar watermark com seu nome e data

### 4. IA (requer ANTHROPIC_API_KEY)

- [ ] Acessar um board com cards
- [ ] Clicar em "Sugerir próxima tarefa"
- [ ] Verificar se retorna 3 sugestões

### 5. Admin

- [ ] Acessar `/admin` com usuário `super_admin`
- [ ] Configurar TOTP com Google Authenticator
- [ ] Verificar dashboard de usuários ativos

---

## Usuários de teste (após `pnpm db:seed`)

| E-mail                    | Role        | Senha           |
| ------------------------- | ----------- | --------------- |
| `admin@demo.coop.br`      | super_admin | `CoopWork@2026` |
| `diretor@demo.coop.br`    | director    | `CoopWork@2026` |
| `gestor@demo.coop.br`     | manager     | `CoopWork@2026` |
| `compliance@demo.coop.br` | compliance  | `CoopWork@2026` |
| `assistente@demo.coop.br` | assistant   | `CoopWork@2026` |

> **Nota**: O login desses usuários usa e-mail/senha via Supabase Auth Admin (não Google OAuth).
> Para logar com eles, o frontend precisaria ter um fluxo de login por senha, que atualmente não está implementado (o app usa apenas Google OAuth).
> Use sua conta Google para logar normalmente e, se quiser testar diferentes roles, altere a role do seu usuário no painel Admin.

---

## Problemas comuns

| Problema                              | Solução                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `Error: GOOGLE_CLIENT_ID is required` | Preencha as variáveis Google no `.env.local` da API                                    |
| `Error connecting to database`        | Verifique o `DATABASE_URL` — deve ser a string do Supabase, não `localhost`            |
| `Redis connection refused`            | Rode `pnpm db:up` para subir o Docker                                                  |
| `401 Unauthorized` em todas as rotas  | JWT_SECRET diferente entre API e token gerado — verifique se não tem dois `.env.local` |
| Build falha com `VITE_SUPABASE_URL`   | Preencha o `apps/web/.env.local`                                                       |
