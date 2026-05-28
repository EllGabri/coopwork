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
