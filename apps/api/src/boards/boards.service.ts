import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateBoardDto, UpdateBoardDto } from './boards.dto';

@Injectable()
export class BoardsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findByWorkspace(workspaceId: string, tenantId: string) {
    const { data, error } = await this.supabase.admin
      .from('boards')
      .select(
        'id, name, description, color, position, is_archived, created_by, created_at, updated_at',
      )
      .eq('workspace_id', workspaceId)
      .eq('tenant_id', tenantId)
      .eq('is_archived', false)
      .order('position');
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findOne(id: string, tenantId: string) {
    const { data, error } = await this.supabase.admin
      .from('boards')
      .select(
        '*, board_columns(id, name, color, position, wip_limit, cards(id, title, priority, due_date, assignee_ids, color, position))',
      )
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    if (error || !data) throw new NotFoundException('Board não encontrado');
    return data;
  }

  async create(workspaceId: string, dto: CreateBoardDto, tenantId: string, userId: string) {
    const { count } = await this.supabase.admin
      .from('boards')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);
    const position = count ?? 0;

    const { data, error } = await this.supabase.admin
      .from('boards')
      .insert({
        ...dto,
        workspace_id: workspaceId,
        tenant_id: tenantId,
        created_by: userId,
        position,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await this.supabase.admin.from('board_columns').insert([
      { board_id: data.id, name: 'A Fazer', color: '#94a3b8', position: 0 },
      { board_id: data.id, name: 'Em Progresso', color: '#3b82f6', position: 1 },
      { board_id: data.id, name: 'Concluído', color: '#22c55e', position: 2 },
    ]);

    return data;
  }

  async update(id: string, dto: UpdateBoardDto, tenantId: string) {
    await this.findOne(id, tenantId);
    const { data, error } = await this.supabase.admin
      .from('boards')
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
      .from('boards')
      .update({ is_archived: true })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) throw new Error(error.message);
    return { message: 'Board arquivado com sucesso' };
  }
}
