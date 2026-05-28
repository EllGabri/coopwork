import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Profile } from 'passport-google-oauth20';
import { SupabaseService } from '../supabase/supabase.service';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  fullName: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly supabase: SupabaseService,
  ) {}

  async validateGoogleUser(profile: Profile): Promise<AuthUser> {
    const email = profile.emails?.[0]?.value ?? '';
    const fullName = profile.displayName ?? email;
    const avatarUrl = profile.photos?.[0]?.value;

    // Upsert user in auth.users via Supabase Admin
    const { data: listData } = await this.supabase.admin.auth.admin.listUsers();
    const existingUser = listData?.users?.find((u) => u.email === email);

    let supabaseUserId: string;

    if (!existingUser) {
      const { data: created, error: createError } = await this.supabase.admin.auth.admin.createUser(
        {
          email,
          email_confirm: true,
          user_metadata: { full_name: fullName, avatar_url: avatarUrl, provider: 'google' },
        },
      );
      if (createError) throw new Error(createError.message);
      supabaseUserId = created.user.id;
    } else {
      supabaseUserId = existingUser.id;
    }

    // Fetch user profile from public.users
    const { data: userProfile } = await this.supabase.admin
      .from('users')
      .select('id, role, tenant_id, full_name, avatar_url, status')
      .eq('id', supabaseUserId)
      .single();

    if (!userProfile || userProfile.status === 'inactive') {
      throw new Error('Usuário não encontrado ou inativo. Contate o administrador.');
    }

    // Update last_login_at
    await this.supabase.admin
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', supabaseUserId);

    return {
      userId: supabaseUserId,
      email,
      role: userProfile.role,
      tenantId: userProfile.tenant_id,
      fullName: userProfile.full_name ?? fullName,
      avatarUrl: userProfile.avatar_url ?? avatarUrl,
    };
  }

  async getProfile(userId: string) {
    const { data } = await this.supabase.admin
      .from('users')
      .select('id, email, full_name, avatar_url, role, tenant_id, department_id, last_login_at')
      .eq('id', userId)
      .single();
    return data as {
      id: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
      role: string;
      tenant_id: string;
      department_id: string | null;
      last_login_at: string | null;
    } | null;
  }

  signJwt(user: AuthUser): string {
    return this.jwtService.sign({
      sub: user.userId,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });
  }
}
