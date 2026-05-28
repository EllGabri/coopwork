import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type UserRole = 'super_admin' | 'director' | 'manager' | 'compliance' | 'assistant';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
