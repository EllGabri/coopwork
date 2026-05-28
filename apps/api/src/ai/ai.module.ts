import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { SystemParamsService } from '../admin/system-params.service';

@Module({
  controllers: [AiController],
  providers: [AiService, SystemParamsService],
  exports: [AiService],
})
export class AiModule {}
