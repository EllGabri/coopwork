import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import { SupabaseService } from '../supabase/supabase.service';
import { ReportsService } from './reports.service';

interface ScheduledReport {
  id: string;
  tenant_id: string;
  created_by: string;
  name: string;
  report_type: string;
  frequency: string;
  recipients: string[];
  department_id: string | null;
  is_active: boolean;
  next_send_at: string | null;
}

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly reportsService: ReportsService,
  ) {}

  async createSchedule(opts: {
    tenantId: string;
    createdBy: string;
    name: string;
    reportType: string;
    frequency: 'weekly' | 'monthly';
    recipients: string[];
    departmentId?: string;
  }) {
    const nextSendAt = this.computeNextSend(opts.frequency);
    const { data, error } = await this.supabase.admin
      .from('scheduled_reports')
      .insert({
        tenant_id: opts.tenantId,
        created_by: opts.createdBy,
        name: opts.name,
        report_type: opts.reportType,
        frequency: opts.frequency,
        recipients: opts.recipients,
        department_id: opts.departmentId ?? null,
        next_send_at: nextSendAt,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async listSchedules(tenantId: string) {
    const { data, error } = await this.supabase.admin
      .from('scheduled_reports')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async deleteSchedule(id: string, tenantId: string) {
    const { error } = await this.supabase.admin
      .from('scheduled_reports')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) throw new Error(error.message);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledReports() {
    const now = new Date().toISOString();
    const { data: due } = await this.supabase.admin
      .from('scheduled_reports')
      .select('*')
      .eq('is_active', true)
      .lte('next_send_at', now)
      .limit(20);

    if (!due?.length) return;

    for (const report of due as ScheduledReport[]) {
      try {
        await this.sendScheduledReport(report);
        const nextSendAt = this.computeNextSend(report.frequency as 'weekly' | 'monthly');
        await this.supabase.admin
          .from('scheduled_reports')
          .update({ last_sent_at: now, next_send_at: nextSendAt })
          .eq('id', report.id);
        this.logger.log(`Scheduled report sent: ${report.name} (${report.id})`);
      } catch (err) {
        this.logger.error(
          `Failed to send scheduled report ${report.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  private async sendScheduledReport(report: ScheduledReport) {
    if (!report.recipients?.length) return;

    const roleForQuery = 'super_admin';
    let reportData: {
      total: number;
      byStatus?: unknown[];
      byAssignee?: unknown[];
      byAction?: unknown[];
      byPriority?: unknown[];
    };

    const filters = {
      tenantId: report.tenant_id,
      role: roleForQuery,
      departmentId: report.department_id ?? undefined,
    };

    switch (report.report_type) {
      case 'tasks-by-status':
        reportData = await this.reportsService.tasksByStatus(filters);
        break;
      case 'tasks-by-assignee':
        reportData = await this.reportsService.tasksByAssignee(filters);
        break;
      case 'documents-accessed':
        reportData = await this.reportsService.documentsAccessed(filters);
        break;
      case 'open-risks':
        reportData = await this.reportsService.openRisks(filters);
        break;
      default:
        return;
    }

    const subject = `[CoopWork] Relatório: ${report.name}`;
    const html = this.buildEmailHtml(report, reportData);

    await this.sendEmail(report.recipients, subject, html);
  }

  private buildEmailHtml(report: ScheduledReport, data: { total: number }) {
    const dateStr = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 18px;">CoopWork</h1>
          <p style="margin: 4px 0 0; opacity: 0.8; font-size: 13px;">Relatório Agendado</p>
        </div>
        <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #0f172a; font-size: 16px;">${report.name}</h2>
          <p style="color: #64748b; font-size: 13px;">Gerado em ${dateStr}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="color: #334155;"><strong>Total de registros:</strong> ${data.total}</p>
          <p style="color: #334155;"><strong>Tipo:</strong> ${report.report_type}</p>
          <p style="color: #334155;"><strong>Frequência:</strong> ${report.frequency === 'weekly' ? 'Semanal' : 'Mensal'}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">
            Este é um relatório automático do CoopWork. Para cancelar o agendamento, acesse a plataforma.
          </p>
        </div>
      </div>
    `;
  }

  private async sendEmail(to: string[], subject: string, html: string) {
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.logger.debug(`[email-dry-run] To: ${to.join(', ')} | Subject: ${subject}`);
      return;
    }
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'noreply@coopwork.app',
      to: to.join(', '),
      subject,
      html,
    });
  }

  private computeNextSend(frequency: 'weekly' | 'monthly'): string {
    const d = new Date();
    if (frequency === 'weekly') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
      d.setDate(1);
    }
    d.setHours(8, 0, 0, 0);
    return d.toISOString();
  }
}
