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
