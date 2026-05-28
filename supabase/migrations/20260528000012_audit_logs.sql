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
