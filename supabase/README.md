# CoopWork — Supabase Setup

Projeto Supabase: `https://idfvcjznbincuedbsk.supabase.co`

## Pré-requisitos

- Conta no [Supabase](https://supabase.com) com o projeto criado
- Supabase CLI instalado: `npm install -g supabase` (opcional para dev local)
- Variáveis de ambiente configuradas em `.env.local` (ver `.env.example`)

---

## 1. Aplicar Migrations

### Via Supabase Dashboard (recomendado)

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione o projeto `idfvcjznbincuedbsk`
3. Vá em **SQL Editor** > **New query**
4. Cole e execute cada arquivo em `supabase/migrations/` em ordem cronológica

### Via Supabase CLI (dev local)

```bash
# Login
supabase login

# Linkar com o projeto remoto
supabase link --project-ref idfvcjznbincuedbsk

# Aplicar migrations
supabase db push
```

---

## 2. Configurar Google OAuth

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto (ou use um existente)
3. Em **APIs & Services** > **Credentials** > **Create OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `https://idfvcjznbincuedbsk.supabase.co/auth/v1/callback`
     - `http://localhost:54321/auth/v1/callback` (dev local)
4. Copie o **Client ID** e **Client Secret**
5. No Supabase Dashboard: **Authentication** > **Providers** > **Google**
   - Cole o Client ID e Client Secret
   - Salve

6. Atualize `.env.local`:
   ```
   GOOGLE_CLIENT_ID=<seu_client_id>
   GOOGLE_CLIENT_SECRET=<seu_client_secret>
   ```

---

## 3. Variáveis de Ambiente Necessárias

| Variável                    | Onde obter                                    |
| --------------------------- | --------------------------------------------- |
| `SUPABASE_URL`              | Dashboard > Settings > API > Project URL      |
| `SUPABASE_ANON_KEY`         | Dashboard > Settings > API > anon/public key  |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard > Settings > API > service_role key |
| `GOOGLE_CLIENT_ID`          | Google Cloud Console > Credentials            |
| `GOOGLE_CLIENT_SECRET`      | Google Cloud Console > Credentials            |

---

## 4. Estrutura de Migrations

| Arquivo                            | Descrição                                          |
| ---------------------------------- | -------------------------------------------------- |
| `20260528000001_storage_setup.sql` | Bucket `ged-documents` + RLS policies              |
| _(task 1.3)_                       | Schema principal: tenants, users, roles, boards... |

---

## 5. Storage Bucket `ged-documents`

- **Tipo**: Privado (sem acesso público)
- **Tamanho máximo**: 50 MB por arquivo
- **Tipos aceitos**: PDF, Word, Excel, PowerPoint, JPG, PNG, CSV, TXT
- **Acesso**: URLs assinadas com TTL de 1h (geradas pelo backend)
