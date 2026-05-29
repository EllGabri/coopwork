/* eslint-disable no-console */
/**
 * CoopWork — Seed Script (DoD 10.6)
 *
 * Creates:
 *   - 1 tenant (Cooperativa de Crédito Demo)
 *   - 2 departments (TI, Compliance)
 *   - 5 users, 1 per role: super_admin, director, manager, compliance, assistant
 *   - 2 workspaces, 5 boards, cards de exemplo
 *   - 11 GED categories
 *
 * Usage:
 *   pnpm db:seed
 *   (requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_USERS = [
  { email: 'admin@demo.coop.br', role: 'super_admin', name: 'Admin CoopWork' },
  { email: 'diretor@demo.coop.br', role: 'director', name: 'Carlos Diretor' },
  { email: 'gestor@demo.coop.br', role: 'manager', name: 'Ana Gestora' },
  { email: 'compliance@demo.coop.br', role: 'compliance', name: 'Pedro Compliance' },
  { email: 'assistente@demo.coop.br', role: 'assistant', name: 'Maria Assistente' },
];

const GED_CATEGORIES = [
  'Instruções',
  'Auditorias',
  'Processos',
  'Manuais',
  'Políticas',
  'Normas',
  'Relatórios',
  'Atas',
  'Contratos',
  'Formulários',
  'Treinamentos',
];

async function main() {
  console.log('🌱 Starting CoopWork seed...\n');

  // ── 1. Tenant ──────────────────────────────────────────────────────────────
  console.log('1. Creating tenant...');
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .upsert({ name: 'Cooperativa de Crédito Demo', slug: 'demo-coop' }, { onConflict: 'slug' })
    .select()
    .single();
  if (tenantErr) throw new Error(`Tenant: ${tenantErr.message}`);
  console.log(`   ✓ Tenant: ${tenant.name} (${tenant.id})\n`);

  // ── 2. Departments ─────────────────────────────────────────────────────────
  console.log('2. Creating departments...');
  const depts = await Promise.all(
    [
      { name: 'Tecnologia da Informação', tenant_id: tenant.id },
      { name: 'Compliance e Auditoria', tenant_id: tenant.id },
    ].map(async (dept) => {
      const { data, error } = await supabase
        .from('departments')
        .upsert(dept, { onConflict: 'name,tenant_id' })
        .select()
        .single();
      if (error) throw new Error(`Dept: ${error.message}`);
      return data;
    }),
  );
  console.log(`   ✓ ${depts.length} departments\n`);

  // ── 3. Auth users + public.users ───────────────────────────────────────────
  console.log('3. Creating test users (5 roles)...');
  const createdUsers: { id: string; email: string; role: string }[] = [];

  const seedPassword = process.env.SEED_USER_PASSWORD;
  if (!seedPassword) throw new Error('SEED_USER_PASSWORD env var is required');

  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existingAuthUsers = listData?.users ?? [];

  for (const u of TEST_USERS) {
    // Create or find auth user
    let authId = existingAuthUsers.find((au) => au.email === u.email)?.id;

    if (!authId) {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: seedPassword,
        email_confirm: true,
        user_metadata: { full_name: u.name, provider: 'seed' },
      });
      if (error) throw new Error(`Auth user ${u.email}: ${error.message}`);
      authId = created.user.id;
    }

    // Upsert public.users record
    const { error: upsertErr } = await supabase.from('users').upsert(
      {
        id: authId,
        tenant_id: tenant.id,
        email: u.email,
        full_name: u.name,
        role: u.role,
        status: 'active',
        department_id: u.role === 'compliance' ? depts[1].id : depts[0].id,
      },
      { onConflict: 'id' },
    );
    if (upsertErr) throw new Error(`public.users ${u.email}: ${upsertErr.message}`);
    createdUsers.push({ id: authId, email: u.email, role: u.role });
    console.log(`   ✓ ${u.email} (${u.role})`);
  }

  const adminUser = createdUsers.find((u) => u.role === 'super_admin')!;
  console.log();

  // ── 4. GED Categories ─────────────────────────────────────────────────────
  console.log('4. Creating 11 GED categories...');
  await Promise.all(
    GED_CATEGORIES.map((name) =>
      supabase
        .from('document_categories')
        .upsert({ name, tenant_id: tenant.id }, { onConflict: 'tenant_id,name' }),
    ),
  );
  console.log(`   ✓ ${GED_CATEGORIES.length} categories\n`);

  // ── 5. Workspaces ──────────────────────────────────────────────────────────
  console.log('5. Creating workspaces + boards + cards...');

  const workspaceDefs = [
    {
      name: 'TI & Projetos Digitais',
      department_id: depts[0].id,
      boards: [
        {
          name: 'Sistema Core',
          cards: ['Revisar arquitetura', 'Implementar cache Redis', 'Documentar APIs'],
        },
        {
          name: 'Infraestrutura Cloud',
          cards: [
            'Configurar Railway deploy',
            'Setup monitoramento Sentry',
            'Criar backups automáticos',
          ],
        },
        {
          name: 'Segurança',
          cards: ['Auditoria de dependências', 'Teste de penetração', 'Revisar políticas CORS'],
        },
      ],
    },
    {
      name: 'Compliance & Auditoria',
      department_id: depts[1].id,
      boards: [
        {
          name: 'Auditorias 2026',
          cards: [
            'Revisão Q1 concluída',
            'Preparar relatório Q2',
            'Reunião com auditores externos',
          ],
        },
        {
          name: 'Regulatório BACEN',
          cards: [
            'Atualizar documentação LGPD',
            'Revisar políticas de privacidade',
            'Treinamento equipe compliance',
          ],
        },
      ],
    },
  ];

  for (const wsDef of workspaceDefs) {
    const { data: ws, error: wsErr } = await supabase
      .from('workspaces')
      .upsert(
        {
          name: wsDef.name,
          tenant_id: tenant.id,
          department_id: wsDef.department_id,
          created_by: adminUser.id,
        },
        { onConflict: 'name,tenant_id' },
      )
      .select()
      .single();
    if (wsErr) throw new Error(`Workspace: ${wsErr.message}`);

    for (const boardDef of wsDef.boards) {
      // Create board with auto-generated columns
      const { data: board, error: boardErr } = await supabase
        .from('boards')
        .upsert(
          {
            name: boardDef.name,
            workspace_id: ws.id,
            tenant_id: tenant.id,
            created_by: adminUser.id,
          },
          { onConflict: 'name,workspace_id' },
        )
        .select()
        .single();
      if (boardErr) throw new Error(`Board: ${boardErr.message}`);

      // Create columns
      const colNames = ['A Fazer', 'Em Progresso', 'Concluído'];
      const columns = await Promise.all(
        colNames.map(async (colName, pos) => {
          const { data: col, error: colErr } = await supabase
            .from('board_columns')
            .upsert(
              { name: colName, board_id: board.id, position: pos },
              { onConflict: 'name,board_id' },
            )
            .select()
            .single();
          if (colErr) throw new Error(`Column: ${colErr.message}`);
          return col;
        }),
      );

      // Create cards in first column
      const todoCol = columns[0];
      for (let i = 0; i < boardDef.cards.length; i++) {
        const cardTitle = boardDef.cards[i];
        const priority = (['low', 'medium', 'high'] as const)[i % 3];
        await supabase.from('cards').upsert(
          {
            title: cardTitle,
            column_id: todoCol.id,
            board_id: board.id,
            tenant_id: tenant.id,
            created_by: adminUser.id,
            position: i,
            priority,
            admin_deleted: false,
          },
          { onConflict: 'title,column_id' },
        );
      }
      console.log(`   ✓ Board: ${boardDef.name} (${boardDef.cards.length} cards)`);
    }
  }

  console.log('\n✅ Seed completed successfully!\n');
  console.log('Test users created:');
  TEST_USERS.forEach((u) => {
    console.log(`  ${u.role.padEnd(12)} | ${u.email}`);
  });
  console.log(`\nPassword: value of SEED_USER_PASSWORD env var`);
  console.log('Note: Users authenticate via Google OAuth in production.\n');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
