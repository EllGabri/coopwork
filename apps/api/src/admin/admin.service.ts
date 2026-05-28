import { Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';
import { BlacklistService } from '../auth/blacklist.service';
import { PermissionsService } from '../auth/permissions.service';

const APP_NAME = 'CoopWork Admin';
const ADMIN_TOKEN_TTL_SECONDS = 8 * 3600;
const JWT_TTL_SECONDS = 7 * 24 * 3600;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly blacklist: BlacklistService,
    private readonly permissionsService: PermissionsService,
  ) {}

  // ---- Permissions matrix ----

  async getPermissions() {
    const { data, error } = await this.supabase.admin
      .from('permissions')
      .select('role, module, action, is_allowed')
      .order('role')
      .order('module');
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async upsertPermission(role: string, module: string, action: string, isAllowed: boolean) {
    const { error } = await this.supabase.admin
      .from('permissions')
      .upsert(
        { role, module, action, is_allowed: isAllowed },
        { onConflict: 'role,module,action' },
      );
    if (error) throw new Error(error.message);
    this.permissionsService.invalidateCache();
  }

  // ---- User management ----

  async listUsers(opts: { search?: string; role?: string; status?: string; tenantId: string }) {
    let query = this.supabase.admin
      .from('users')
      .select('id, email, full_name, role, status, department_id, last_login_at, created_at')
      .eq('tenant_id', opts.tenantId)
      .order('created_at', { ascending: false });

    if (opts.role) query = query.eq('role', opts.role);
    if (opts.status) query = query.eq('status', opts.status);
    if (opts.search) {
      query = query.or(`email.ilike.%${opts.search}%,full_name.ilike.%${opts.search}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async changeUserRole(targetUserId: string, newRole: string, adminUserId: string) {
    if (targetUserId === adminUserId) {
      throw new ForbiddenException('Não é possível alterar o próprio role');
    }
    const { error } = await this.supabase.admin
      .from('users')
      .update({ role: newRole })
      .eq('id', targetUserId);
    if (error) throw new Error(error.message);
  }

  async changeUserStatus(
    targetUserId: string,
    newStatus: 'active' | 'inactive',
    adminUserId: string,
  ) {
    if (targetUserId === adminUserId) {
      throw new ForbiddenException('Não é possível desativar a própria conta');
    }
    const { error } = await this.supabase.admin
      .from('users')
      .update({ status: newStatus })
      .eq('id', targetUserId);
    if (error) throw new Error(error.message);
  }

  async forceLogout(targetUserId: string) {
    await this.blacklist.add(targetUserId, JWT_TTL_SECONDS);
    this.logger.log(`Force logout: ${targetUserId}`);
  }

  // ---- Card trash ----

  async searchCards(tenantId: string, search: string) {
    const { data, error } = await this.supabase.admin
      .from('cards')
      .select(
        'id, title, priority, is_archived, admin_deleted, admin_delete_reason, admin_deleted_at, column_id, created_at',
      )
      .eq('tenant_id', tenantId)
      .ilike('title', `%${search}%`)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async adminDeleteCard(cardId: string, adminId: string, reason: string) {
    const { error } = await this.supabase.admin
      .from('cards')
      .update({
        admin_deleted: true,
        admin_deleted_by: adminId,
        admin_deleted_at: new Date().toISOString(),
        admin_delete_reason: reason,
      })
      .eq('id', cardId);
    if (error) throw new Error(error.message);

    await this.supabase.admin.from('admin_actions_log').insert({
      admin_id: adminId,
      action: 'card_delete',
      entity_type: 'card',
      entity_id: cardId,
      reason,
    });
  }

  async restoreCard(cardId: string, adminId: string) {
    const { error } = await this.supabase.admin
      .from('cards')
      .update({
        admin_deleted: false,
        admin_deleted_by: null,
        admin_deleted_at: null,
        admin_delete_reason: null,
      })
      .eq('id', cardId);
    if (error) throw new Error(error.message);

    await this.supabase.admin.from('admin_actions_log').insert({
      admin_id: adminId,
      action: 'card_restore',
      entity_type: 'card',
      entity_id: cardId,
    });
  }

  async getAdminActionsLog(tenantId: string) {
    void tenantId;
    const { data, error } = await this.supabase.admin
      .from('admin_actions_log')
      .select('id, admin_id, action, entity_type, entity_id, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getTotpStatus(userId: string): Promise<{ enabled: boolean }> {
    const { data } = await this.supabase.admin
      .from('users')
      .select('totp_enabled')
      .eq('id', userId)
      .single();
    return { enabled: (data as { totp_enabled: boolean } | null)?.totp_enabled ?? false };
  }

  async setupTotp(
    userId: string,
    email: string,
  ): Promise<{ otpauthUrl: string; qrCodeDataUrl: string; secret: string }> {
    const secret = speakeasy.generateSecret({ name: `${APP_NAME} (${email})`, length: 20 });
    const base32 = secret.base32;

    await this.supabase.admin
      .from('users')
      .update({ totp_secret: base32, totp_enabled: false })
      .eq('id', userId);

    const otpauthUrl = secret.otpauth_url ?? '';
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return { otpauthUrl, qrCodeDataUrl, secret: base32 };
  }

  async verifyAndEnableTotp(
    userId: string,
    code: string,
    email: string,
  ): Promise<{ adminToken: string }> {
    const { data: user } = await this.supabase.admin
      .from('users')
      .select('totp_secret, totp_enabled, role')
      .eq('id', userId)
      .single();

    const userRow = user as {
      totp_secret: string | null;
      totp_enabled: boolean;
      role: string;
    } | null;
    if (!userRow) throw new UnauthorizedException('Usuário não encontrado');
    if (userRow.role !== 'super_admin')
      throw new ForbiddenException('Acesso restrito a super_admin');
    if (!userRow.totp_secret) throw new UnauthorizedException('TOTP não configurado');

    const valid = speakeasy.totp.verify({
      secret: userRow.totp_secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!valid) throw new UnauthorizedException('Código TOTP inválido');

    if (!userRow.totp_enabled) {
      await this.supabase.admin.from('users').update({ totp_enabled: true }).eq('id', userId);
    }

    const adminToken = this.jwtService.sign(
      { sub: userId, email, scope: 'admin' },
      { expiresIn: ADMIN_TOKEN_TTL_SECONDS },
    );

    return { adminToken };
  }

  async verifyAdminToken(token: string): Promise<{ userId: string; email: string }> {
    try {
      const payload = this.jwtService.verify<{ sub: string; email: string; scope: string }>(token);
      if (payload.scope !== 'admin') throw new Error('Invalid scope');
      return { userId: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedException('Sessão admin expirada ou inválida');
    }
  }
}
