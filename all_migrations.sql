-- Migration: 20260528000002_initial_schema
-- Task: 1.3

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('super_admin','director','manager','compliance','assistant');
CREATE TYPE user_status AS ENUM ('active','inactive','pending');
CREATE TYPE theme_preference AS ENUM ('light','dark','system');

CREATE TABLE public.tenants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  logo_url      TEXT,
  primary_color TEXT DEFAULT '#1a56db',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.departments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT DEFAULT '#6366f1',
  icon        TEXT DEFAULT 'building',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  department_id   UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  avatar_url      TEXT,
  role            user_role NOT NULL DEFAULT 'assistant',
  status          user_status NOT NULL DEFAULT 'active',
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        user_role NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  description TEXT,
  level       INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.permissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role        user_role NOT NULL,
  module      TEXT NOT NULL,
  action      TEXT NOT NULL,
  is_allowed  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role, module, action)
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_preferences (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  theme               theme_preference NOT NULL DEFAULT 'system',
  language            TEXT NOT NULL DEFAULT 'pt-BR',
  notifications_email BOOLEAN NOT NULL DEFAULT true,
  notifications_web   BOOLEAN NOT NULL DEFAULT true,
  sidebar_collapsed   BOOLEAN NOT NULL DEFAULT false,
  boards_order        UUID[] DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY tenants_select ON public.tenants FOR SELECT TO authenticated
USING (id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY tenants_super_admin ON public.tenants FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY departments_select ON public.departments FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY departments_manage ON public.departments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tenant_id = departments.tenant_id AND role IN ('super_admin','director','manager')))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tenant_id = departments.tenant_id AND role IN ('super_admin','director','manager')));

CREATE POLICY users_select ON public.users FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.users WHERE id = auth.uid()));

CREATE POLICY users_super_admin ON public.users FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY users_service_insert ON public.users FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY roles_select ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY permissions_select ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY permissions_super_admin ON public.permissions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY user_prefs_own ON public.user_preferences FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS
$$BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER tenants_upd BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER departments_upd BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER users_upd BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER permissions_upd BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER user_prefs_upd BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: auto-create user_preferences on user insert
CREATE OR REPLACE FUNCTION public.create_user_preferences_on_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS
$$BEGIN INSERT INTO public.user_preferences (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING; RETURN NEW; END;$$;

CREATE TRIGGER on_user_created_create_prefs
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_preferences_on_insert();

-- Indexes
CREATE INDEX idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX idx_users_department_id ON public.users(department_id);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_departments_tenant_id ON public.departments(tenant_id);
CREATE INDEX idx_permissions_role ON public.permissions(role);
CREATE INDEX idx_permissions_module ON public.permissions(module);
-- ==============================================================================
-- Migration: 20260528000003_seed_roles_permissions
-- Task: 1.3 -- Seed de roles e permissions iniciais
-- ==============================================================================

-- Roles iniciais com hierarquia
INSERT INTO public.roles (name, label, description, level) VALUES
  ('super_admin', 'Super Admin',   'Acesso total ao sistema e configurações globais', 5),
  ('director',   'Diretor',        'Gerencia toda a cooperativa, vê todos os departamentos', 4),
  ('manager',    'Gestor',         'Gerencia departamentos e equipes', 3),
  ('compliance', 'Compliance',     'Acesso de leitura completo para auditoria e conformidade', 2),
  ('assistant',  'Assistente',     'Acesso básico ao sistema', 1)
ON CONFLICT (name) DO NOTHING;

-- Matrix de permissões: role x módulo x ação
INSERT INTO public.permissions (role, module, action, is_allowed) VALUES
  -- super_admin: acesso total
  ('super_admin', 'boards',   'manage',  true),
  ('super_admin', 'ged',      'manage',  true),
  ('super_admin', 'reports',  'manage',  true),
  ('super_admin', 'admin',    'manage',  true),
  ('super_admin', 'users',    'manage',  true),
  -- director: gerencia tudo exceto admin
  ('director',   'boards',   'manage',  true),
  ('director',   'ged',      'manage',  true),
  ('director',   'reports',  'manage',  true),
  ('director',   'admin',    'read',    false),
  ('director',   'users',    'manage',  true),
  -- manager: gerencia boards e lê relatórios
  ('manager',    'boards',   'manage',  true),
  ('manager',    'ged',      'write',   true),
  ('manager',    'reports',  'read',    true),
  ('manager',    'admin',    'read',    false),
  ('manager',    'users',    'read',    true),
  -- compliance: leitura ampla para auditoria
  ('compliance', 'boards',   'read',    true),
  ('compliance', 'ged',      'read',    true),
  ('compliance', 'reports',  'read',    true),
  ('compliance', 'admin',    'read',    false),
  ('compliance', 'users',    'read',    true),
  -- assistant: acesso básico
  ('assistant',  'boards',   'write',   true),
  ('assistant',  'ged',      'read',    false),
  ('assistant',  'reports',  'read',    false),
  ('assistant',  'admin',    'read',    false),
  ('assistant',  'users',    'read',    false)
ON CONFLICT (role, module, action) DO NOTHING;
-- =============================================================================
-- Migration: 20260528000001_storage_setup
-- Task: 1.2 — Configurar Supabase Storage bucket ged-documents com RLS
-- =============================================================================

-- Criar bucket ged-documents (privado)
-- Tipos aceitos: PDF, Word, Excel, imagens, texto
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ged-documents',
  'ged-documents',
  false,                -- bucket privado — sem acesso público direto
  52428800,             -- 50 MB em bytes
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- RLS Policies para storage.objects no bucket ged-documents
-- =============================================================================

-- Policy 1: Usuários autenticados podem fazer upload de documentos
CREATE POLICY "ged_documents_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ged-documents'
  AND auth.uid() IS NOT NULL
);

-- Policy 2: Usuários podem ler documentos próprios.
--           Roles com acesso amplo (compliance, director, manager, super_admin)
--           podem ler todos os documentos — refinado em 5.1 com ACL por departamento.
CREATE POLICY "ged_documents_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ged-documents'
  AND (
    -- owner sempre pode ler seus próprios arquivos
    owner = auth.uid()
    OR
    -- roles com acesso amplo (será substituído por ACL de departamento na task 5.1)
    EXISTS (
      SELECT 1
      FROM auth.users au
      JOIN public.users pu ON pu.id = au.id
      WHERE au.id = auth.uid()
        AND pu.role IN ('compliance', 'director', 'manager', 'super_admin')
    )
  )
);

-- Policy 3: Somente owner ou super_admin podem deletar documentos
CREATE POLICY "ged_documents_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ged-documents'
  AND (
    owner = auth.uid()
    OR
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND role = 'super_admin'
    )
  )
);

-- Policy 4: Owner pode atualizar metadados do documento
CREATE POLICY "ged_documents_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ged-documents'
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'ged-documents'
  AND owner = auth.uid()
);
-- Migration: 20260528000004_boards_schema
-- Task: 3.1 -- workspaces, boards, board_columns, cards, comments, attachments

CREATE TYPE card_priority AS ENUM ('low','medium','high','urgent');

-- WORKSPACES
CREATE TABLE public.workspaces (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  color         TEXT DEFAULT '#6366f1',
  icon          TEXT DEFAULT 'briefcase',
  is_archived   BOOLEAN NOT NULL DEFAULT false,
  created_by    UUID NOT NULL REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- BOARDS
CREATE TABLE public.boards (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  color         TEXT DEFAULT '#6366f1',
  is_archived   BOOLEAN NOT NULL DEFAULT false,
  position      INTEGER NOT NULL DEFAULT 0,
  created_by    UUID NOT NULL REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

-- BOARD_COLUMNS
CREATE TABLE public.board_columns (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id  UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  color     TEXT DEFAULT '#94a3b8',
  position  INTEGER NOT NULL DEFAULT 0,
  wip_limit INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;

-- CARDS
CREATE TABLE public.cards (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  column_id     UUID NOT NULL REFERENCES public.board_columns(id) ON DELETE CASCADE,
  board_id      UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  color         TEXT,
  priority      card_priority NOT NULL DEFAULT 'medium',
  due_date      TIMESTAMPTZ,
  position      INTEGER NOT NULL DEFAULT 0,
  assignee_ids  UUID[] DEFAULT '{}',
  tags          TEXT[] DEFAULT '{}',
  is_archived   BOOLEAN NOT NULL DEFAULT false,
  created_by    UUID NOT NULL REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- CARD_COMMENTS
CREATE TABLE public.card_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id    UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES public.users(id),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.card_comments ENABLE ROW LEVEL SECURITY;

-- CARD_ATTACHMENTS
CREATE TABLE public.card_attachments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id       UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES public.users(id),
  filename      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.card_attachments ENABLE ROW LEVEL SECURITY;

-- RLS: helper — user belongs to tenant of a workspace
-- Workspaces: users see only workspaces from their department (or tenant-wide for managers+)
CREATE POLICY workspaces_select ON public.workspaces FOR SELECT TO authenticated
USING (
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  AND (
    department_id IS NULL
    OR department_id = (SELECT department_id FROM public.users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin','director','manager','compliance'))
  )
);

CREATE POLICY workspaces_insert ON public.workspaces FOR INSERT TO authenticated
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin','director','manager'))
);

CREATE POLICY workspaces_update ON public.workspaces FOR UPDATE TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin','director','manager')))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY workspaces_delete ON public.workspaces FOR DELETE TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin','director')));

-- Boards: same department constraint as workspaces
CREATE POLICY boards_select ON public.boards FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY boards_insert ON public.boards FOR INSERT TO authenticated
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin','director','manager')));

CREATE POLICY boards_update ON public.boards FOR UPDATE TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin','director','manager')))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY boards_delete ON public.boards FOR DELETE TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin','director')));

-- board_columns: accessible by users who can see the board
CREATE POLICY columns_all ON public.board_columns FOR ALL TO authenticated
USING (board_id IN (SELECT id FROM public.boards WHERE tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())))
WITH CHECK (board_id IN (SELECT id FROM public.boards WHERE tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())));

-- Cards: tenant-scoped; assignees always have read access
CREATE POLICY cards_select ON public.cards FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY cards_insert ON public.cards FOR INSERT TO authenticated
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY cards_update ON public.cards FOR UPDATE TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY cards_delete ON public.cards FOR DELETE TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  AND (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin','director','manager'))));

-- card_comments: tenant-scoped; author can edit/delete own comments
CREATE POLICY comments_select ON public.card_comments FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY comments_insert ON public.card_comments FOR INSERT TO authenticated
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()) AND author_id = auth.uid());

CREATE POLICY comments_update ON public.card_comments FOR UPDATE TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY comments_delete ON public.card_comments FOR DELETE TO authenticated
USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin','director','manager')));

-- card_attachments: tenant-scoped
CREATE POLICY attachments_select ON public.card_attachments FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY attachments_insert ON public.card_attachments FOR INSERT TO authenticated
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()) AND uploaded_by = auth.uid());

CREATE POLICY attachments_delete ON public.card_attachments FOR DELETE TO authenticated
USING (uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin','director','manager')));

-- updated_at triggers
CREATE TRIGGER workspaces_upd BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER boards_upd BEFORE UPDATE ON public.boards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER columns_upd BEFORE UPDATE ON public.board_columns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER cards_upd BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER comments_upd BEFORE UPDATE ON public.card_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Performance indexes
CREATE INDEX idx_workspaces_tenant ON public.workspaces(tenant_id);
CREATE INDEX idx_workspaces_dept ON public.workspaces(department_id);
CREATE INDEX idx_boards_workspace ON public.boards(workspace_id);
CREATE INDEX idx_boards_tenant ON public.boards(tenant_id);
CREATE INDEX idx_columns_board ON public.board_columns(board_id);
CREATE INDEX idx_cards_column ON public.cards(column_id);
CREATE INDEX idx_cards_board ON public.cards(board_id);
CREATE INDEX idx_cards_tenant ON public.cards(tenant_id);
CREATE INDEX idx_cards_due_date ON public.cards(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_cards_assignees ON public.cards USING gin(assignee_ids);
CREATE INDEX idx_comments_card ON public.card_comments(card_id);
CREATE INDEX idx_attachments_card ON public.card_attachments(card_id);
-- Migration: 20260528000005_notifications
-- Task: 3.9 -- notifications table

CREATE TYPE notification_type AS ENUM ('card_assigned','due_soon','comment_mention');

CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  link        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  entity_id   UUID,
  entity_type TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_own ON public.notifications FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
-- ==============================================================================
-- Migration: 20260528000006_ged_schema
-- Task: 5.1 -- Schema GED: documents, document_versions, document_categories, document_access_log
-- ==============================================================================

-- ============================================================
-- Enum: document_status
-- ============================================================
CREATE TYPE document_status AS ENUM ('active', 'archived', 'expired');

-- ============================================================
-- Table: document_categories
-- ============================================================
CREATE TABLE IF NOT EXISTS public.document_categories (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  description   TEXT,
  icon          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, name)
);

ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

-- compliance e acima leem todas as categorias do tenant
CREATE POLICY "doc_categories_read" ON public.document_categories
  FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.users
      WHERE id = auth.uid()
    )
    AND (
      SELECT role FROM public.users WHERE id = auth.uid()
    ) IN ('super_admin', 'director', 'manager', 'compliance')
  );

-- super_admin e director gerenciam categorias
CREATE POLICY "doc_categories_manage" ON public.document_categories
  FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'director')
  );

-- ============================================================
-- Table: documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID            NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  department_id     UUID            REFERENCES public.departments(id) ON DELETE SET NULL,
  category_id       UUID            REFERENCES public.document_categories(id) ON DELETE SET NULL,
  title             TEXT            NOT NULL,
  description       TEXT,
  storage_path      TEXT,           -- Supabase Storage object path
  mime_type         TEXT,
  size_bytes        BIGINT,
  owner_id          UUID            NOT NULL REFERENCES public.users(id),
  status            document_status NOT NULL DEFAULT 'active',
  current_version   INTEGER         NOT NULL DEFAULT 1,
  tags              TEXT[]          NOT NULL DEFAULT '{}',
  review_date       DATE,
  expiration_date   DATE,
  is_flowchart      BOOLEAN         NOT NULL DEFAULT false,  -- true = React Flow JSON doc
  flowchart_json    JSONB,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- assistant: sem acesso (policy omitida — default DENY)
-- compliance, manager, director, super_admin: leem documentos do tenant
CREATE POLICY "documents_read" ON public.documents
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'director', 'manager', 'compliance')
  );

-- manager e acima inserem documentos
CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'director', 'manager')
  );

-- manager e acima atualizam documentos do tenant
CREATE POLICY "documents_update" ON public.documents
  FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'director', 'manager')
  );

-- super_admin e director deletam/arquivam documentos
CREATE POLICY "documents_delete" ON public.documents
  FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'director')
  );

-- ============================================================
-- Table: document_versions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.document_versions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version       INTEGER     NOT NULL,
  storage_path  TEXT        NOT NULL,
  mime_type     TEXT,
  size_bytes    BIGINT,
  uploaded_by   UUID        NOT NULL REFERENCES public.users(id),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(document_id, version)
);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_versions_read" ON public.document_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id
        AND d.tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'director', 'manager', 'compliance')
    )
  );

CREATE POLICY "doc_versions_insert" ON public.document_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id
        AND d.tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'director', 'manager')
    )
  );

-- ============================================================
-- Table: document_access_log
-- ============================================================
CREATE TYPE document_action AS ENUM ('view', 'download', 'edit', 'delete', 'share', 'restore_version');

CREATE TABLE IF NOT EXISTS public.document_access_log (
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID            NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id       UUID            NOT NULL REFERENCES public.users(id),
  action        document_action NOT NULL,
  ip_address    INET,
  metadata      JSONB,
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

ALTER TABLE public.document_access_log ENABLE ROW LEVEL SECURITY;

-- Somente super_admin e compliance visualizam o log
CREATE POLICY "doc_access_log_read" ON public.document_access_log
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'compliance')
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id
        AND d.tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    )
  );

-- Sistema insere logs (via service_role no backend)
CREATE POLICY "doc_access_log_insert" ON public.document_access_log
  FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- Table: document_acl (per-document user-level access control — task 5.9)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.document_acl (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  can_view      BOOLEAN     NOT NULL DEFAULT true,
  can_download  BOOLEAN     NOT NULL DEFAULT false,
  can_edit      BOOLEAN     NOT NULL DEFAULT false,
  granted_by    UUID        NOT NULL REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(document_id, user_id)
);

ALTER TABLE public.document_acl ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_acl_read" ON public.document_acl
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'director', 'manager')
  );

CREATE POLICY "doc_acl_manage" ON public.document_acl
  FOR ALL
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'director', 'manager')
  );

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_documents_tenant   ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner    ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_status   ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_tags     ON public.documents USING GIN(tags);

-- Full-text search vector
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_documents_fts ON public.documents USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_doc_versions_document ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_access_log_document ON public.document_access_log(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_access_log_user ON public.document_access_log(user_id);

-- ============================================================
-- Trigger: updated_at on documents
-- ============================================================
CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Seed: 11 categorias GED padrão (inseridas via service_role após tenant criado)
-- Comentário: valores de referência; inserção real ocorre no onboarding do tenant
-- ============================================================
-- Categorias esperadas pelo DoD da task 5.6:
-- Instruções, Auditorias, Processos, Manuais, Políticas, Normas, Relatórios,
-- Atas, Contratos, Formulários, Treinamentos
-- ==============================================================================
-- Migration: 20260528000007_ai_suggestions
-- Task: 6.1 -- Tabela ai_suggestions para log de chamadas à IA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id     UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature       TEXT        NOT NULL,       -- e.g. 'suggest_tasks', 'risk_analysis', 'ged_improvements'
  prompt_hash   TEXT        NOT NULL,       -- SHA-256 of the prompt (for dedup / audit)
  response      TEXT,                       -- raw text response from Claude
  tokens_used   INTEGER,
  model         TEXT        NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
  latency_ms    INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own suggestions
CREATE POLICY "ai_suggestions_own" ON public.ai_suggestions
  FOR SELECT
  USING (user_id = auth.uid());

-- Backend inserts via service_role (no RLS restriction needed for INSERT)
CREATE POLICY "ai_suggestions_insert" ON public.ai_suggestions
  FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user    ON public.ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_tenant  ON public.ai_suggestions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_feature ON public.ai_suggestions(feature);
-- ==============================================================================
-- Migration: 20260528000008_totp_columns
-- Task: 7.1 -- TOTP support for admin double-authentication
-- ==============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS totp_secret    TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled   BOOLEAN NOT NULL DEFAULT false;
-- ==============================================================================
-- Migration: 20260528000009_admin_cards_trash
-- Task: 7.4 -- Admin card trash: soft-delete with reason + restore + log
-- ==============================================================================

-- Add admin-delete columns to cards
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS admin_deleted      BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_deleted_by   UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_deleted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_delete_reason TEXT;

-- Admin actions log (reusable audit table)
CREATE TABLE IF NOT EXISTS public.admin_actions_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      UUID        NOT NULL REFERENCES public.users(id),
  action        TEXT        NOT NULL,
  entity_type   TEXT        NOT NULL,
  entity_id     UUID        NOT NULL,
  reason        TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_log_read" ON public.admin_actions_log
  FOR SELECT
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "admin_log_insert" ON public.admin_actions_log
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_log_entity ON public.admin_actions_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_admin  ON public.admin_actions_log(admin_id);
-- ==============================================================================
-- Migration: 20260528000010_system_params
-- Task: 7.5 -- System configuration table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.system_params (
  key         TEXT        PRIMARY KEY,
  value       TEXT        NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_params ENABLE ROW LEVEL SECURITY;

-- Only super_admin can read/write
CREATE POLICY "system_params_admin" ON public.system_params
  FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin');

-- Default values
INSERT INTO public.system_params (key, value, description) VALUES
  ('upload_max_mb',      '50',   'Tamanho máximo de upload em MB'),
  ('signed_url_ttl_h',   '1',    'TTL da URL assinada do GED em horas'),
  ('ai_rate_limit_hour', '20',   'Limite de chamadas IA por usuário/hora'),
  ('notification_email', '',     'E-mail de notificações do sistema')
ON CONFLICT (key) DO NOTHING;
-- ==============================================================================
-- Migration: 20260528000011_scheduled_reports
-- Task: 8.5 -- Scheduled report configurations
-- ==============================================================================

CREATE TYPE report_frequency AS ENUM ('weekly', 'monthly');
CREATE TYPE report_type_enum AS ENUM ('tasks-by-status', 'tasks-by-assignee', 'documents-accessed', 'open-risks');

CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID              NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by      UUID              NOT NULL REFERENCES public.users(id),
  name            TEXT              NOT NULL,
  report_type     report_type_enum  NOT NULL,
  frequency       report_frequency  NOT NULL DEFAULT 'monthly',
  recipients      TEXT[]            NOT NULL DEFAULT '{}',
  department_id   UUID              REFERENCES public.departments(id),
  is_active       BOOLEAN           NOT NULL DEFAULT true,
  last_sent_at    TIMESTAMPTZ,
  next_send_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ       NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduled_reports_tenant" ON public.scheduled_reports
  FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'director', 'manager')
  );

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_tenant ON public.scheduled_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next   ON public.scheduled_reports(next_send_at) WHERE is_active = true;

CREATE TRIGGER set_scheduled_reports_updated_at
  BEFORE UPDATE ON public.scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- ==============================================================================
-- Migration: 20260528000012_audit_logs
-- Task: 9.5 -- Global audit log for all mutative actions
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id       UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  action        TEXT        NOT NULL,      -- 'create', 'update', 'delete', 'archive'
  entity_type   TEXT        NOT NULL,      -- 'card', 'document', 'user', 'workspace', 'board'
  entity_id     UUID        NOT NULL,
  old_value     JSONB,                     -- snapshot before change
  new_value     JSONB,                     -- snapshot after change
  ip_address    INET,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_read" ON public.audit_logs
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant     ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity     ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user       ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
