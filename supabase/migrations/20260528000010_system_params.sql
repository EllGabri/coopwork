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
