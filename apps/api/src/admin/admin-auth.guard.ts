import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly adminService: AdminService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload & { userId: string } }>();

    const mainUser = req.user;
    if (!mainUser) throw new UnauthorizedException('Autenticação necessária');
    if (mainUser.role !== 'super_admin')
      throw new ForbiddenException('Acesso restrito a super_admin');

    const adminToken = req.cookies?.admin_access_token as string | undefined;
    if (!adminToken)
      throw new UnauthorizedException('Verificação TOTP necessária para acessar o admin');

    await this.adminService.verifyAdminToken(adminToken);
    return true;
  }
}
