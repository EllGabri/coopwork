import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './workspaces.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(tenantId: string, departmentId?: string, role?: string) {
    let query = this.supabase.admin
      .from('workspaces')
      .select(
        'id, name, description, color, icon, department_id, is_archived, created_by, created_at, updated_at',
      )
      .eq('tenant_id', tenantId)
      .eq('is_archived', false)
      .order('name');

    if (
      departmentId &&
      !['super_admin', 'director', 'manager', 'compliance'].includes(role ?? '')
    ) {
      query = query.or(`department_id.eq.${departmentId},department_id.is.null`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findOne(id: string, tenantId: string) {
    const { data, error } = await this.supabase.admin
      .from('workspaces')
      .select('*, boards(id, name, color, position, is_archived)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    if (error || !data) throw new NotFoundException('Workspace não encontrado');
    return data;
  }

  async create(dto: CreateWorkspaceDto, tenantId: string, userId: string) {
    const { data, error } = await this.supabase.admin
      .from('workspaces')
      .insert({ ...dto, tenant_id: tenantId, created_by: userId })
      .select()
      .single();
    if (error?.code === '23505')
      throw new ConflictException('Já existe um workspace com este nome');
    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, dto: UpdateWorkspaceDto, tenantId: string) {
    await this.findOne(id, tenantId);
    const { data, error } = await this.supabase.admin
      .from('workspaces')
      .update(dto)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    const { error } = await this.supabase.admin
      .from('workspaces')
      .update({ is_archived: true })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) throw new Error(error.message);
    return { message: 'Workspace arquivado com sucesso' };
  }
}
