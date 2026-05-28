import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';
import { PERMISSION_KEY, PermissionMeta } from '../decorators/require-permission.decorator';
import { PermissionsService } from '../permissions.service';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 5,
  director: 4,
  manager: 3,
  compliance: 2,
  assistant: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const permMeta = this.reflector.getAllAndOverride<PermissionMeta>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length && !permMeta) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role: UserRole; userId: string } | undefined;

    if (!user) throw new ForbiddenException('Usuário não autenticado');

    // Role-level check
    if (requiredRoles?.length) {
      const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
      const hasRole = requiredRoles.some((r) => ROLE_HIERARCHY[r] <= userLevel);
      if (!hasRole) throw new ForbiddenException('Permissão insuficiente para esta operação');
    }

    // Module/action check from DB permissions table
    if (permMeta) {
      const allowed = await this.permissions.hasPermission(
        user.role,
        permMeta.module,
        permMeta.action,
      );
      if (!allowed)
        throw new ForbiddenException(
          `Acesso ao módulo '${permMeta.module}' não permitido para role '${user.role}'`,
        );
    }

    return true;
  }
}
