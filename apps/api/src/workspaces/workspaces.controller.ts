import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './workspaces.dto';

@Controller('workspaces')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  findAll(
    @CurrentUser() user: { tenantId: string; role: string; userId: string; departmentId?: string },
  ) {
    return this.workspacesService.findAll(user.tenantId, user.departmentId, user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { tenantId: string }) {
    return this.workspacesService.findOne(id, user.tenantId);
  }

  @Post()
  @Roles('manager')
  create(
    @Body() dto: CreateWorkspaceDto,
    @CurrentUser() user: { tenantId: string; userId: string },
  ) {
    return this.workspacesService.create(dto, user.tenantId, user.userId);
  }

  @Patch(':id')
  @Roles('manager')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser() user: { tenantId: string },
  ) {
    return this.workspacesService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Roles('director')
  remove(@Param('id') id: string, @CurrentUser() user: { tenantId: string }) {
    return this.workspacesService.remove(id, user.tenantId);
  }
}
