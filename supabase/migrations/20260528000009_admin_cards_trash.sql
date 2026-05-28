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
