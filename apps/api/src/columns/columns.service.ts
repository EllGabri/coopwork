import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateColumnDto, UpdateColumnDto } from './columns.dto';

@Injectable()
export class ColumnsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findByBoard(boardId: string) {
    const { data, error } = await this.supabase.admin
      .from('board_columns')
      .select('id, name, color, position, wip_limit, created_at, updated_at')
      .eq('board_id', boardId)
      .order('position');
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async create(boardId: string, dto: CreateColumnDto) {
    let position = dto.position;
    if (position === undefined) {
      const { count } = await this.supabase.admin
        .from('board_columns')
        .select('id', { count: 'exact', head: true })
        .eq('board_id', boardId);
      position = count ?? 0;
    }
    const { data, error } = await this.supabase.admin
      .from('board_columns')
      .insert({ ...dto, board_id: boardId, position })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, dto: UpdateColumnDto) {
    const { data, error } = await this.supabase.admin
      .from('board_columns')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw new NotFoundException('Coluna não encontrada');
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase.admin.from('board_columns').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'Coluna removida com sucesso' };
  }

  async reorder(boardId: string, order: string[]) {
    const updates = order.map((id, position) => ({ id, position }));
    await Promise.all(
      updates.map((u) =>
        this.supabase.admin
          .from('board_columns')
          .update({ position: u.position })
          .eq('id', u.id)
          .eq('board_id', boardId),
      ),
    );
    return this.findByBoard(boardId);
  }
}
