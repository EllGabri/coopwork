import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCardDto, UpdateCardDto, MoveCardDto } from './cards.dto';

@Injectable()
export class CardsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findByColumn(columnId: string) {
    const { data, error } = await this.supabase.admin
      .from('cards')
      .select(
        'id, title, description, color, priority, due_date, assignee_ids, tags, position, is_archived, created_by, created_at, updated_at',
      )
      .eq('column_id', columnId)
      .eq('is_archived', false)
      .eq('admin_deleted', false)
      .order('position');
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.admin
      .from('cards')
      .select(
        '*, card_comments(id, content, author_id, created_at), card_attachments(id, filename, mime_type, size_bytes, created_at)',
      )
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException('Card não encontrado');
    return data;
  }

  async create(
    columnId: string,
    boardId: string,
    tenantId: string,
    userId: string,
    dto: CreateCardDto,
  ) {
    let position = dto.position;
    if (position === undefined) {
      const { count } = await this.supabase.admin
        .from('cards')
        .select('id', { count: 'exact', head: true })
        .eq('column_id', columnId)
        .eq('is_archived', false);
      position = count ?? 0;
    }
    const { data, error } = await this.supabase.admin
      .from('cards')
      .insert({
        ...dto,
        column_id: columnId,
        board_id: boardId,
        tenant_id: tenantId,
        created_by: userId,
        position,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, dto: UpdateCardDto) {
    const { data, error } = await this.supabase.admin
      .from('cards')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw new NotFoundException('Card não encontrado');
    return data;
  }

  async move(id: string, dto: MoveCardDto) {
    const { data, error } = await this.supabase.admin
      .from('cards')
      .update({ column_id: dto.column_id, position: dto.position })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw new NotFoundException('Card não encontrado');
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase.admin
      .from('cards')
      .update({ is_archived: true })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { message: 'Card arquivado com sucesso' };
  }
}
