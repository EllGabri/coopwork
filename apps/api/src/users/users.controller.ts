import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserRoleDto, UpdateUserStatusDto } from './users.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@CurrentUser() user: { tenantId: string }) {
    return this.usersService.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { tenantId: string }) {
    return this.usersService.findOne(id, user.tenantId);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: { tenantId: string; userId: string },
  ) {
    return this.usersService.updateRole(id, dto.role, user.tenantId, user.userId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: { tenantId: string; userId: string },
  ) {
    return this.usersService.updateStatus(id, dto.status, user.tenantId, user.userId);
  }
}
