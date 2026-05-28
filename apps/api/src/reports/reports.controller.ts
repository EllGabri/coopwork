import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ReportsService } from './reports.service';

type AuthUser = JwtPayload & { userId: string };

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('tasks-by-status')
  tasksByStatus(
    @CurrentUser() user: AuthUser,
    @Query('departmentId') departmentId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reportsService.tasksByStatus({
      tenantId: user.tenantId,
      role: user.role,
      departmentId,
      dateFrom,
      dateTo,
    });
  }

  @Get('tasks-by-assignee')
  tasksByAssignee(
    @CurrentUser() user: AuthUser,
    @Query('departmentId') departmentId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reportsService.tasksByAssignee({
      tenantId: user.tenantId,
      role: user.role,
      departmentId,
      dateFrom,
      dateTo,
    });
  }

  @Get('documents-accessed')
  documentsAccessed(
    @CurrentUser() user: AuthUser,
    @Query('departmentId') departmentId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reportsService.documentsAccessed({
      tenantId: user.tenantId,
      role: user.role,
      departmentId,
      dateFrom,
      dateTo,
    });
  }

  @Get('open-risks')
  openRisks(
    @CurrentUser() user: AuthUser,
    @Query('departmentId') departmentId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reportsService.openRisks({
      tenantId: user.tenantId,
      role: user.role,
      departmentId,
      dateFrom,
      dateTo,
    });
  }
}
