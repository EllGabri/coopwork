/* eslint-disable no-console */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const EMAIL = 'g18antunes@gmail.com';

  const { data: tenant } = await supabase.from('tenants').select('id').single();
  const { data: dept } = await supabase.from('departments').select('id').limit(1).single();

  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const authUser = list?.users?.find((u) => u.email === EMAIL);

  if (!authUser) {
    console.log('Usuário não encontrado no auth — criando...');
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      email_confirm: true,
      user_metadata: { full_name: 'Gabriel', provider: 'google' },
    });
    if (error) throw new Error(error.message);
    console.log('Auth user criado:', created.user.id);

    const { error: upsertErr } = await supabase.from('users').upsert(
      {
        id: created.user.id,
        tenant_id: tenant!.id,
        email: EMAIL,
        full_name: 'Gabriel',
        role: 'super_admin',
        status: 'active',
        department_id: dept!.id,
      },
      { onConflict: 'id' },
    );
    if (upsertErr) throw new Error(upsertErr.message);
  } else {
    console.log('Auth user encontrado:', authUser.id);
    const { error: upsertErr } = await supabase.from('users').upsert(
      {
        id: authUser.id,
        tenant_id: tenant!.id,
        email: EMAIL,
        full_name: 'Gabriel',
        role: 'super_admin',
        status: 'active',
        department_id: dept!.id,
      },
      { onConflict: 'id' },
    );
    if (upsertErr) throw new Error(upsertErr.message);
  }

  console.log(`✅ ${EMAIL} registrado como super_admin`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
