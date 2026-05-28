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
