import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;
  private readonly adminClient: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL!;
    const anon = process.env.SUPABASE_ANON_KEY!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    this.client = createClient(url, anon);
    this.adminClient = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  get publicClient(): SupabaseClient {
    return this.client;
  }
  get admin(): SupabaseClient {
    return this.adminClient;
  }
}
