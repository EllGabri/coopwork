import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface AuditEntry {
  tenantId: string;
  userId?: string;
  action: 'create' | 'update' | 'delete' | 'archive';
  entityType: 'card' | 'document' | 'user' | 'workspace' | 'board' | 'column' | 'comment';
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.supabase.admin.from('audit_logs').insert({
        tenant_id: entry.tenantId,
        user_id: entry.userId ?? null,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        old_value: entry.oldValue ?? null,
        new_value: entry.newValue ?? null,
        ip_address: entry.ipAddress ?? null,
        metadata: entry.metadata ?? null,
      });
    } catch (err) {
      // Audit logging must never break the main flow
      this.logger.error(`Audit log failed: ${(err as Error).message}`);
    }
  }

  async findAll(opts: {
    tenantId: string;
    entityType?: string;
    entityId?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = this.supabase.admin
      .from('audit_logs')
      .select(
        'id, action, entity_type, entity_id, user_id, old_value, new_value, ip_address, created_at',
      )
      .eq('tenant_id', opts.tenantId)
      .order('created_at', { ascending: false });

    if (opts.entityType) query = query.eq('entity_type', opts.entityType);
    if (opts.entityId) query = query.eq('entity_id', opts.entityId);
    if (opts.userId) query = query.eq('user_id', opts.userId);
    if (opts.dateFrom) query = query.gte('created_at', opts.dateFrom);
    if (opts.dateTo) query = query.lte('created_at', opts.dateTo + 'T23:59:59');

    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .returns<{ id: string }[]>();

    if (error) throw new Error(error.message);
    return { data: data ?? [], total: count ?? 0, limit, offset };
  }
}
