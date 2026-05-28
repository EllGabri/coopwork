import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { SystemParamsService } from '../admin/system-params.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentLifecycleService, SystemParamsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
