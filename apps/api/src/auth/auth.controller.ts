import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService, AuthUser } from './auth.service';
import { PermissionsService } from './permissions.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';

const MODULES = ['boards', 'ged', 'reports', 'admin', 'users'];
const ACTIONS = ['read', 'write', 'manage', 'delete'];

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Passport redireciona para Google — handler nunca executa
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleCallback(@Req() req: Request & { user: AuthUser }, @Res() res: Response) {
    const token = this.authService.signJwt(req.user);
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });

    res.redirect(process.env.WEB_URL ?? 'http://localhost:5173');
  }

  @Get('my-permissions')
  @UseGuards(JwtAuthGuard)
  async getMyPermissions(@CurrentUser() user: JwtPayload & { userId: string }) {
    const result: Record<string, Record<string, boolean>> = {};
    for (const mod of MODULES) {
      result[mod] = {};
      for (const action of ACTIONS) {
        result[mod][action] = await this.permissionsService.hasPermission(
          user.role as Parameters<typeof this.permissionsService.hasPermission>[0],
          mod,
          action,
        );
      }
    }
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: JwtPayload & { userId: string }) {
    const profile = await this.authService.getProfile(user.userId);
    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      departmentId: profile?.department_id ?? null,
      lastLoginAt: profile?.last_login_at ?? null,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Res() res: Response) {
    res.clearCookie('access_token', { httpOnly: true, sameSite: 'lax' });
    res.json({ message: 'Logout realizado com sucesso' });
  }
}
