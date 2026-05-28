import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ScheduledReportsController } from './scheduled-reports.controller';
import { ScheduledReportsService } from './scheduled-reports.service';

@Module({
  controllers: [ReportsController, ScheduledReportsController],
  providers: [ReportsService, ScheduledReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
