import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';

const APP_NAME = 'CoopWork Admin';
const ADMIN_TOKEN_TTL_SECONDS = 8 * 3600; // 8 hours

@Injectable()
export class AdminService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwtService: JwtService,
  ) {}

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
