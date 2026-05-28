import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardsNestedController } from './cards-nested.controller';
import { CardsService } from './cards.service';
import { AuditLogService } from '../common/audit-log.service';

@Module({
  controllers: [CardsController, CardsNestedController],
  providers: [CardsService, AuditLogService],
  exports: [CardsService],
})
export class CardsModule {}
