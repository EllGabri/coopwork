import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const CACHE_TTL_MS = 30_000; // 30s

export interface ParamRow {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

@Injectable()
export class SystemParamsService {
  private cache: Map<string, string> = new Map();
  private cacheExpiry = 0;

  constructor(private readonly supabase: SupabaseService) {}

  private async loadCache() {
    const { data } = await this.supabase.admin.from('system_params').select('key, value');
    if (data) {
      this.cache.clear();
      for (const row of data as { key: string; value: string }[]) {
        this.cache.set(row.key, row.value);
      }
      this.cacheExpiry = Date.now() + CACHE_TTL_MS;
    }
  }

  async get(key: string, defaultValue: string): Promise<string> {
    if (Date.now() > this.cacheExpiry) await this.loadCache();
    return this.cache.get(key) ?? defaultValue;
  }

  async getNumber(key: string, defaultValue: number): Promise<number> {
    const val = await this.get(key, String(defaultValue));
    const num = Number(val);
    return isNaN(num) ? defaultValue : num;
  }

  async getAll(): Promise<ParamRow[]> {
    const { data, error } = await this.supabase.admin
      .from('system_params')
      .select('key, value, description, updated_at')
      .order('key');
    if (error) throw new Error(error.message);
    return (data as ParamRow[]) ?? [];
  }

  async set(key: string, value: string): Promise<void> {
    const { error } = await this.supabase.admin
      .from('system_params')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw new Error(error.message);
    // Invalidate cache
    this.cacheExpiry = 0;
  }
}
