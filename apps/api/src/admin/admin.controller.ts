import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminAuthGuard } from './admin-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AdminService } from './admin.service';

type AuthUser = JwtPayload & { userId: string };

const ADMIN_COOKIE_TTL_MS = 8 * 3600 * 1000;

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('totp/status')
  getTotpStatus(@CurrentUser() user: AuthUser) {
    return this.adminService.getTotpStatus(user.userId);
  }

  @Post('totp/setup')
  setupTotp(@CurrentUser() user: AuthUser) {
    return this.adminService.setupTotp(user.userId, user.email);
  }

  @Post('totp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyTotp(
    @Body('code') code: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { adminToken } = await this.adminService.verifyAndEnableTotp(
      user.userId,
      code,
      user.email,
    );

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('admin_access_token', adminToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: ADMIN_COOKIE_TTL_MS,
    });

    return { success: true };
  }

  @Post('totp/logout')
  @HttpCode(HttpStatus.OK)
  logoutAdmin(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('admin_access_token', { httpOnly: true, sameSite: 'lax' });
    return { success: true };
  }

  // Protected admin endpoint — requires both JWT + TOTP
  @Get('me')
  @UseGuards(AdminAuthGuard)
  getAdminMe(@CurrentUser() user: AuthUser) {
    return { userId: user.userId, email: user.email, role: user.role };
  }

  // ---- User management (requires AdminAuthGuard) ----

  @Get('users')
  @UseGuards(AdminAuthGuard)
  listUsers(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.listUsers({ search, role, status, tenantId: user.tenantId });
  }

  @Patch('users/:id/role')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  changeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('role') role: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.changeUserRole(id, role, user.userId);
  }

  @Patch('users/:id/status')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: 'active' | 'inactive',
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.changeUserStatus(id, status, user.userId);
  }

  @Post('users/:id/force-logout')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  forceLogout(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.forceLogout(id);
  }

  // ---- Permissions matrix ----

  @Get('permissions')
  @UseGuards(AdminAuthGuard)
  getPermissions() {
    return this.adminService.getPermissions();
  }

  @Patch('permissions')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  upsertPermission(
    @Body() body: { role: string; module: string; action: string; isAllowed: boolean },
  ) {
    return this.adminService.upsertPermission(body.role, body.module, body.action, body.isAllowed);
  }
}
