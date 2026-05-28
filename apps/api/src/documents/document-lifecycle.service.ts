import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DocumentLifecycleService {
  private readonly logger = new Logger(DocumentLifecycleService.name);

  constructor(private readonly supabase: SupabaseService) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDocumentLifecycle() {
    this.logger.log('Running document lifecycle check…');

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const nowIso = now.toISOString();
    const in30Iso = in30Days.toISOString().split('T')[0];
    const todayIso = now.toISOString().split('T')[0];

    await Promise.all([
      this.notifyUpcomingReviews(todayIso, in30Iso),
      this.notifyUpcomingExpirations(todayIso, in30Iso),
      this.markExpiredDocuments(nowIso),
    ]);
  }

  private async notifyUpcomingReviews(todayIso: string, in30Iso: string) {
    const { data: docs } = await this.supabase.admin
      .from('documents')
      .select('id, title, review_date, owner_id')
      .eq('status', 'active')
      .gte('review_date', todayIso)
      .lte('review_date', in30Iso);

    if (!docs?.length) return;

    for (const doc of docs) {
      const ownerEmail = await this.getOwnerEmail(doc.owner_id as string);
      if (!ownerEmail) continue;

      const reviewDate = new Date(doc.review_date as string).toLocaleDateString('pt-BR');
      await this.sendEmail({
        to: ownerEmail,
        subject: `[CoopWork GED] Revisão pendente: ${doc.title}`,
        html: `
          <p>Olá,</p>
          <p>O documento <strong>${doc.title}</strong> está programado para revisão em <strong>${reviewDate}</strong>.</p>
          <p>Por favor, revise e atualize o documento no prazo.</p>
          <p>— CoopWork GED</p>
        `,
      });
      this.logger.log(`Review reminder sent for doc ${doc.id} to ${ownerEmail}`);
    }
  }

  private async notifyUpcomingExpirations(todayIso: string, in30Iso: string) {
    const { data: docs } = await this.supabase.admin
      .from('documents')
      .select('id, title, expiration_date, owner_id')
      .eq('status', 'active')
      .gte('expiration_date', todayIso)
      .lte('expiration_date', in30Iso);

    if (!docs?.length) return;

    for (const doc of docs) {
      const ownerEmail = await this.getOwnerEmail(doc.owner_id as string);
      if (!ownerEmail) continue;

      const expiresOn = new Date(doc.expiration_date as string).toLocaleDateString('pt-BR');
      await this.sendEmail({
        to: ownerEmail,
        subject: `[CoopWork GED] Documento prestes a expirar: ${doc.title}`,
        html: `
          <p>Olá,</p>
          <p>O documento <strong>${doc.title}</strong> expira em <strong>${expiresOn}</strong>.</p>
          <p>Renove ou arquive o documento antes dessa data.</p>
          <p>— CoopWork GED</p>
        `,
      });
      this.logger.log(`Expiration warning sent for doc ${doc.id} to ${ownerEmail}`);
    }
  }

  private async markExpiredDocuments(nowIso: string) {
    const today = nowIso.split('T')[0];
    const { data, error } = await this.supabase.admin
      .from('documents')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('expiration_date', today)
      .select('id');

    if (error) {
      this.logger.error(`Failed to mark expired documents: ${error.message}`);
      return;
    }
    if (data?.length) {
      this.logger.log(`Marked ${data.length} document(s) as expired`);
    }
  }

  private async getOwnerEmail(userId: string): Promise<string | null> {
    const { data } = await this.supabase.admin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
    return (data as { email: string } | null)?.email ?? null;
  }

  private async sendEmail(opts: { to: string; subject: string; html: string }) {
    const host = process.env.SMTP_HOST;
    if (!host) {
      // SMTP not configured — log only
      this.logger.debug(`[email-dry-run] To: ${opts.to} | Subject: ${opts.subject}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'noreply@coopwork.app',
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  }
}
