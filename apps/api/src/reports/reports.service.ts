import { Injectable, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const READ_ROLES = ['super_admin', 'director', 'manager', 'compliance'];

export interface ReportFilters {
  tenantId: string;
  role: string;
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly supabase: SupabaseService) {}

  private assertAccess(role: string) {
    if (!READ_ROLES.includes(role)) throw new ForbiddenException('Acesso negado a relatórios');
  }

  async tasksByStatus(filters: ReportFilters) {
    this.assertAccess(filters.role);

    let query = this.supabase.admin
      .from('cards')
      .select(
        'id, title, priority, is_archived, admin_deleted, column_id, created_at, updated_at, board_columns!inner(name, board_id, boards!inner(tenant_id, department_id))',
      )
      .eq('board_columns.boards.tenant_id', filters.tenantId)
      .eq('is_archived', false)
      .eq('admin_deleted', false);

    if (filters.departmentId) {
      query = query.eq('board_columns.boards.department_id', filters.departmentId);
    }
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59');

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const byStatus: Record<string, number> = {};
    for (const card of data ?? []) {
      const colName =
        (card as unknown as { board_columns: { name: string } }).board_columns?.name ?? 'Outros';
      byStatus[colName] = (byStatus[colName] ?? 0) + 1;
    }

    return {
      total: (data ?? []).length,
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      filters,
    };
  }

  async tasksByAssignee(filters: ReportFilters) {
    this.assertAccess(filters.role);

    let query = this.supabase.admin
      .from('cards')
      .select(
        'id, assignee_ids, priority, board_columns!inner(name, boards!inner(tenant_id, department_id))',
      )
      .eq('board_columns.boards.tenant_id', filters.tenantId)
      .eq('is_archived', false)
      .eq('admin_deleted', false);

    if (filters.departmentId) {
      query = query.eq('board_columns.boards.department_id', filters.departmentId);
    }
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59');

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const byAssignee: Record<string, number> = {};
    for (const card of (data ?? []) as { assignee_ids: string[] }[]) {
      const assignees = card.assignee_ids ?? [];
      if (assignees.length === 0) {
        byAssignee['Sem responsável'] = (byAssignee['Sem responsável'] ?? 0) + 1;
      } else {
        for (const uid of assignees) {
          byAssignee[uid] = (byAssignee[uid] ?? 0) + 1;
        }
      }
    }

    return {
      total: (data ?? []).length,
      byAssignee: Object.entries(byAssignee).map(([assigneeId, count]) => ({
        assigneeId,
        count,
      })),
      filters,
    };
  }

  async documentsAccessed(filters: ReportFilters) {
    this.assertAccess(filters.role);

    let query = this.supabase.admin
      .from('document_access_log')
      .select('id, action, user_id, created_at, documents!inner(title, tenant_id, department_id)')
      .eq('documents.tenant_id', filters.tenantId);

    if (filters.departmentId) {
      query = query.eq('documents.department_id', filters.departmentId);
    }
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59');

    const { data, error } = await query.order('created_at', { ascending: false }).limit(500);
    if (error) throw new Error(error.message);

    const byAction: Record<string, number> = {};
    for (const log of (data ?? []) as { action: string }[]) {
      byAction[log.action] = (byAction[log.action] ?? 0) + 1;
    }

    return {
      total: (data ?? []).length,
      byAction: Object.entries(byAction).map(([action, count]) => ({ action, count })),
      recentLogs: (data ?? []).slice(0, 20),
      filters,
    };
  }

  async openRisks(filters: ReportFilters) {
    this.assertAccess(filters.role);

    const now = new Date().toISOString();

    let query = this.supabase.admin
      .from('cards')
      .select(
        'id, title, priority, due_date, assignee_ids, board_columns!inner(name, boards!inner(id, name, tenant_id, department_id))',
      )
      .eq('board_columns.boards.tenant_id', filters.tenantId)
      .eq('is_archived', false)
      .eq('admin_deleted', false)
      .lt('due_date', now)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true });

    if (filters.departmentId) {
      query = query.eq('board_columns.boards.department_id', filters.departmentId);
    }
    if (filters.dateFrom) query = query.gte('due_date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('due_date', filters.dateTo + 'T23:59:59');

    const { data, error } = await query.limit(500);
    if (error) throw new Error(error.message);

    const byPriority: Record<string, number> = {};
    for (const card of (data ?? []) as { priority: string }[]) {
      byPriority[card.priority] = (byPriority[card.priority] ?? 0) + 1;
    }

    return {
      total: (data ?? []).length,
      byPriority: Object.entries(byPriority).map(([priority, count]) => ({ priority, count })),
      overdueCards: (data ?? []).slice(0, 50),
      filters,
    };
  }
}
