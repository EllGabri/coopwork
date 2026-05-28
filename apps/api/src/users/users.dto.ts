import { IsEnum } from 'class-validator';
import { UserRole } from '../auth/decorators/roles.decorator';

export class UpdateUserRoleDto {
  @IsEnum(['super_admin', 'director', 'manager', 'compliance', 'assistant'])
  role!: UserRole;
}

export class UpdateUserStatusDto {
  @IsEnum(['active', 'inactive'])
  status!: 'active' | 'inactive';
}
