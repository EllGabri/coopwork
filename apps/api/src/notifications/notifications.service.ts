import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsGateway } from './notifications.gateway';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  is_read: boolean;
  entity_id?: string;
  entity_type?: string;
  created_at: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async createAndSend(
    userId: string,
    tenantId: string,
    data: {
      type: string;
      title: string;
      body: string;
      link?: string;
      entity_id?: string;
      entity_type?: string;
    },
  ) {
    const { data: notif, error } = await this.supabase.admin
      .from('notifications')
      .insert({ user_id: userId, tenant_id: tenantId, ...data })
      .select()
      .single();
    if (error) throw new Error(error.message);
    this.gateway.emitToUser(userId, 'notification:new', notif);
    return notif as Notification;
  }

  async findAll(userId: string) {
    const { data } = await this.supabase.admin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    return (data ?? []) as Notification[];
  }

  async markRead(id: string, userId: string) {
    await this.supabase.admin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId);
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.supabase.admin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    return { ok: true };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkDueSoonCards() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const { data: cards } = await this.supabase.admin
      .from('cards')
      .select('id, title, board_id, tenant_id, assignee_ids, due_date')
      .gte('due_date', now.toISOString())
      .lte('due_date', in24h.toISOString())
      .eq('is_archived', false);

    for (const card of cards ?? []) {
      for (const userId of card.assignee_ids as string[]) {
        const existing = await this.supabase.admin
          .from('notifications')
          .select('id')
          .eq('entity_id', card.id)
          .eq('type', 'due_soon')
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString())
          .single();
        if (!existing.data) {
          await this.createAndSend(userId, card.tenant_id as string, {
            type: 'due_soon',
            title: 'Prazo em 24h',
            body: `Card "${card.title as string}" vence em menos de 24 horas.`,
            entity_id: card.id as string,
            entity_type: 'card',
          });
        }
      }
    }
  }
}
