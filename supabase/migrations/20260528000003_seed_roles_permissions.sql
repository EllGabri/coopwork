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
