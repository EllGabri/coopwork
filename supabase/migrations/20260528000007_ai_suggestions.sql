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
