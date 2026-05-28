import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Connection pooling: Supabase JS client uses PostgREST (HTTP), not direct PG connections.
// PgBouncer (transaction mode, port 6543) is automatically used by Supabase's pooler URL.
// For direct PG access (e.g., migrations), use SUPABASE_DB_POOLER_URL from .env.
// The Supabase dashboard -> Settings -> Database -> Connection pooling configures max_connections.

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;
  private readonly adminClient: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL!;
    const anon = process.env.SUPABASE_ANON_KEY!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    this.client = createClient(url, anon, {
      global: { fetch: fetch.bind(globalThis) },
    });
    this.adminClient = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetch.bind(globalThis) },
    });
  }

  get publicClient(): SupabaseClient {
    return this.client;
  }
  get admin(): SupabaseClient {
    return this.adminClient;
  }
}
