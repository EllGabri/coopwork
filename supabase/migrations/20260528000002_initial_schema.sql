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
