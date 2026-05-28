import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UserRole } from '../auth/decorators/roles.decorator';

@Injectable()
export class UsersService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(tenantId: string) {
    const { data, error } = await this.supabase.admin
      .from('users')
      .select(
        'id, email, full_name, avatar_url, role, status, department_id, last_login_at, created_at',
      )
      .eq('tenant_id', tenantId)
      .order('full_name');
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findOne(id: string, tenantId: string) {
    const { data, error } = await this.supabase.admin
      .from('users')
      .select(
        'id, email, full_name, avatar_url, role, status, department_id, last_login_at, created_at',
      )
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    if (error || !data) throw new NotFoundException('Usuário não encontrado');
    return data;
  }

  async updateRole(id: string, role: UserRole, tenantId: string, requesterId: string) {
    if (id === requesterId)
      throw new ForbiddenException('Não é permitido alterar sua própria role');
    await this.findOne(id, tenantId);
    const { data, error } = await this.supabase.admin
      .from('users')
      .update({ role })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, email, role')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateStatus(
    id: string,
    status: 'active' | 'inactive',
    tenantId: string,
    requesterId: string,
  ) {
    if (id === requesterId)
      throw new ForbiddenException('Não é permitido desativar sua própria conta');
    await this.findOne(id, tenantId);
    const { data, error } = await this.supabase.admin
      .from('users')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, email, status')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
}
