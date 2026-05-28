import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UserRole } from './decorators/roles.decorator';

@Injectable()
export class PermissionsService {
  private cache = new Map<string, boolean>();
  private cacheExpiry = new Map<string, number>();
  private readonly TTL_MS = 30_000; // 30s cache — reflects permission changes in <30s

  constructor(private readonly supabase: SupabaseService) {}

  async hasPermission(role: UserRole, module: string, action: string): Promise<boolean> {
    const key = `${role}:${module}:${action}`;
    const now = Date.now();

    if (this.cache.has(key) && (this.cacheExpiry.get(key) ?? 0) > now) {
      return this.cache.get(key)!;
    }

    const { data, error } = await this.supabase.admin
      .from('permissions')
      .select('is_allowed')
      .eq('role', role)
      .eq('module', module)
      .eq('action', action)
      .single();

    const allowed = !error && (data?.is_allowed ?? false);
    this.cache.set(key, allowed);
    this.cacheExpiry.set(key, now + this.TTL_MS);
    return allowed;
  }

  invalidateCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}
