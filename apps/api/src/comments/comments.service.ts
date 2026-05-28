import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCommentDto } from './comments.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(cardId: string, tenantId: string, userId: string, dto: CreateCommentDto) {
    const { data, error } = await this.supabase.admin
      .from('card_comments')
      .insert({ card_id: cardId, tenant_id: tenantId, author_id: userId, content: dto.content })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async remove(id: string, userId: string) {
    const { error } = await this.supabase.admin
      .from('card_comments')
      .delete()
      .eq('id', id)
      .eq('author_id', userId);
    if (error) throw new Error(error.message);
    return { message: 'Comentário removido' };
  }
}
