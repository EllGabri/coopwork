import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ScheduledReportsService } from './scheduled-reports.service';

type AuthUser = JwtPayload & { userId: string };

@Controller('reports/schedules')
@UseGuards(JwtAuthGuard)
export class ScheduledReportsController {
  constructor(private readonly scheduledReportsService: ScheduledReportsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.scheduledReportsService.listSchedules(user.tenantId);
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      reportType: string;
      frequency: 'weekly' | 'monthly';
      recipients: string[];
      departmentId?: string;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.scheduledReportsService.createSchedule({
      tenantId: user.tenantId,
      createdBy: user.userId,
      name: body.name,
      reportType: body.reportType,
      frequency: body.frequency,
      recipients: body.recipients,
      departmentId: body.departmentId,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.scheduledReportsService.deleteSchedule(id, user.tenantId);
  }
}
